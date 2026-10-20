import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { adminLink } from "../lib/admin-url"
import { readOwnerEmail } from "../lib/owner-email"
import { readStoreForEmail } from "../lib/store-for-email"
import { inventoryItemIdsOfEvent, readVariantStock, STOCK_EVENTS } from "../lib/variant-stock"
import { INVENTORY_LOW_STOCK_ALERTED_AT, lowStockTransition } from "../low-stock/rules"
import type { LowStockOwnerData } from "../email/templates/low-stock-owner"
import { STOREFRONT_MODULE } from "../modules/storefront"
import type StorefrontModuleService from "../modules/storefront/service"

type Logger = { warn: (message: string) => void; error: (message: string) => void }

// Sends the "low-stock-owner" email when the stock of a variant crosses the low stock threshold.
// The stock change is already saved, so this handler catches each error and writes it to the log.
export default async function lowStockHandler({
  event: { name, data },
  container,
}: SubscriberArgs<unknown>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let threshold: number
  let inventoryItemIds: string[]
  try {
    const storefront: StorefrontModuleService = container.resolve(STOREFRONT_MODULE)
    threshold = (await storefront.getSettings()).low_stock_threshold
    // A threshold of 0 turns the email off, so the stock reads are not necessary.
    if (threshold <= 0) {
      return
    }
    inventoryItemIds = await inventoryItemIdsOfEvent(container, name, data)
  } catch (error) {
    logger.error(`The low stock check for event ${name} failed. Cause: ${causeOf(error)}`)
    return
  }

  const locking = container.resolve(Modules.LOCKING)
  // One failed item must not stop the check of the other items.
  for (const inventoryItemId of inventoryItemIds) {
    try {
      // One order gives several stock events at the same time. Without the lock, two handlers
      // read the item with no mark, and the owner gets two emails for one crossing.
      await locking.execute(`low-stock:${inventoryItemId}`, () =>
        checkInventoryItem(container, logger, inventoryItemId, threshold)
      )
    } catch (error) {
      logger.error(
        `The low stock check for inventory item ${inventoryItemId} failed. Cause: ${causeOf(error)}`
      )
    }
  }
}

async function checkInventoryItem(
  container: MedusaContainer,
  logger: Logger,
  inventoryItemId: string,
  threshold: number
): Promise<void> {
  const stock = await readVariantStock(container, inventoryItemId)
  if (!stock) {
    return
  }

  const inventory = container.resolve(Modules.INVENTORY)
  const item = await inventory.retrieveInventoryItem(inventoryItemId)
  const metadata = { ...(item.metadata ?? {}) }
  const transition = lowStockTransition({
    available: stock.available,
    threshold,
    manage_inventory: stock.manage_inventory,
    alerted_at: metadata[INVENTORY_LOW_STOCK_ALERTED_AT],
  })

  if (transition === "reset") {
    // Medusa merges the metadata of an update, and only an empty string removes a key.
    await inventory.updateInventoryItems({
      id: inventoryItemId,
      metadata: { ...metadata, [INVENTORY_LOW_STOCK_ALERTED_AT]: "" },
    })
    return
  }
  if (transition !== "alert") {
    return
  }

  const to = await readOwnerEmail(container)
  if (!to) {
    logger.warn(
      `The owner email is empty. The low stock email for inventory item ${inventoryItemId} was not sent. Set the store contact email or STORE_OWNER_EMAIL.`
    )
    return
  }

  const emailData: LowStockOwnerData = {
    store: await readStoreForEmail(container),
    threshold,
    product_title: stock.product_title,
    variant_title: stock.variant_title,
    sku: stock.sku,
    available: stock.available,
    admin_url: adminLink(container, `/products/${stock.product_id}`),
  }
  await container.resolve(Modules.NOTIFICATION).createNotifications({
    to,
    channel: "email",
    template: "low-stock-owner",
    data: emailData,
  })

  // The mark comes after the send, so a failed send tries again at the next stock event.
  await inventory.updateInventoryItems({
    id: inventoryItemId,
    metadata: { ...metadata, [INVENTORY_LOW_STOCK_ALERTED_AT]: new Date().toISOString() },
  })
}

function causeOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export const config: SubscriberConfig = {
  event: STOCK_EVENTS,
}
