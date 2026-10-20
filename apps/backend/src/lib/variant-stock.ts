import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  Modules,
} from "@medusajs/framework/utils"

export type VariantStock = {
  variant_id: string
  product_id: string
  product_title: string
  variant_title: string | null
  sku: string | null
  thumbnail: string | null
  manage_inventory: boolean
  allow_backorder: boolean
  available: number
  inventory_item_id: string
}

// The events that change the available stock of an inventory item. A plain string array, because
// the subscriber config does not accept a readonly array.
export const STOCK_EVENTS: string[] = [
  "inventory-level.updated",
  "reservation-item.created",
  "reservation-item.updated",
  "reservation-item.deleted",
]

// The link product_variant_inventory_item gives the inventory item the field alias "variants".
export const VARIANT_STOCK_FIELDS = [
  "id",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.thumbnail",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.product_id",
  "variants.product.id",
  "variants.product.title",
  "variants.product.thumbnail",
]

type QueriedVariant = {
  id: string
  title?: string | null
  sku?: string | null
  thumbnail?: string | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  product_id?: string | null
  product?: { id?: string | null; title?: string | null; thumbnail?: string | null } | null
}

type QueriedItem = { id: string; variants?: (QueriedVariant | null)[] | null }

/**
 * Returns the variant, the product, and the available stock of an inventory item. Returns null
 * when the item or its variant does not exist, for example after the variant was deleted.
 */
export async function readVariantStock(
  scope: MedusaContainer,
  inventoryItemId: string
): Promise<VariantStock | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [row],
  } = await query.graph({
    entity: "inventory_item",
    fields: VARIANT_STOCK_FIELDS,
    filters: { id: inventoryItemId },
  })
  const item = row as unknown as QueriedItem | undefined
  // The template creates one inventory item for each variant. A shared item gives the first
  // variant that still exists.
  const variant = (item?.variants ?? []).find((entry): entry is QueriedVariant => !!entry?.id)
  if (!item || !variant) {
    return null
  }

  return {
    variant_id: variant.id,
    product_id: variant.product_id ?? variant.product?.id ?? "",
    product_title: variant.product?.title ?? "",
    variant_title: variant.title ?? null,
    sku: variant.sku ?? null,
    // The same order as the price drop email, so one variant shows one image in both groups.
    thumbnail: variant.thumbnail ?? variant.product?.thumbnail ?? null,
    manage_inventory: !!variant.manage_inventory,
    allow_backorder: !!variant.allow_backorder,
    available: await readAvailable(scope, variant.id),
    inventory_item_id: item.id,
  }
}

// The stock comes from the first sales channel of the store, so the number matches the stock that
// the storefront shows. A store with no sales channel cannot sell, so the stock is 0.
export async function readAvailable(scope: MedusaContainer, variantId: string): Promise<number> {
  const [salesChannel] = await scope
    .resolve(Modules.SALES_CHANNEL)
    .listSalesChannels({}, { take: 1, order: { created_at: "ASC" } })
  if (!salesChannel) {
    return 0
  }
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  // The workspace has two copies of @medusajs/types, so the Query type needs a cast.
  const availability = await getVariantAvailability(
    query as Parameters<typeof getVariantAvailability>[0],
    { variant_ids: [variantId], sales_channel_id: salesChannel.id }
  )
  // A variant with no inventory item gives null.
  return availability[variantId]?.availability ?? 0
}

/** Returns true when a customer can buy the variant now. */
export function isInStock(
  stock: Pick<VariantStock, "manage_inventory" | "allow_backorder" | "available">
): boolean {
  return !stock.manage_inventory || stock.allow_backorder || stock.available > 0
}

/**
 * Returns the inventory item ids of a stock event, with no duplicates. The payload is `{ id }` or
 * a list of `{ id }`. The id is the id of an inventory level or of a reservation.
 */
export async function inventoryItemIdsOfEvent(
  scope: MedusaContainer,
  name: string,
  data: unknown
): Promise<string[]> {
  const ids = idsOfPayload(data)
  if (ids.length === 0) {
    return []
  }

  const inventory = scope.resolve(Modules.INVENTORY)
  let rows: { inventory_item_id: string }[] = []
  if (name === "inventory-level.updated") {
    rows = await inventory.listInventoryLevels({ id: ids })
  } else if (name.startsWith("reservation-item.")) {
    // A cancelled order soft-deletes its reservations. withDeleted keeps their inventory items,
    // because the deletion makes the stock available again. A hard delete gives no row.
    rows = await inventory.listReservationItems({ id: ids }, { withDeleted: true })
  }

  return [...new Set(rows.map(({ inventory_item_id }) => inventory_item_id))]
}

function idsOfPayload(data: unknown): string[] {
  const entries = Array.isArray(data) ? data : [data]
  const ids = entries.flatMap((entry) => {
    const id = (entry as { id?: unknown } | null | undefined)?.id
    return typeof id === "string" && id.length > 0 ? [id] : []
  })
  return [...new Set(ids)]
}
