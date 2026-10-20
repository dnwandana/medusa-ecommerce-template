import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, QueryContext } from "@medusajs/framework/utils"

type QueriedVariant = {
  id: string
  calculated_price?: { calculated_amount?: unknown } | null
}

/**
 * Returns the calculated price of each variant in the first region of the store, in whole rupiah.
 * A variant with no price, or a store with no region, gives null.
 */
export async function readVariantPrices(
  scope: MedusaContainer,
  variantIds: string[]
): Promise<Map<string, number | null>> {
  const prices = new Map<string, number | null>(variantIds.map((id) => [id, null]))
  if (variantIds.length === 0) {
    return prices
  }

  // The store has one region, as the storefront uses.
  const [region] = await scope
    .resolve(Modules.REGION)
    .listRegions({}, { take: 1, order: { created_at: "ASC" } })
  if (!region) {
    return prices
  }

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "calculated_price.calculated_amount"],
    filters: { id: variantIds },
    context: {
      calculated_price: QueryContext({ region_id: region.id, currency_code: "idr" }),
    },
  })

  for (const variant of data as unknown as QueriedVariant[]) {
    const amount = variant.calculated_price?.calculated_amount
    // Query can give a BigNumber for an amount.
    prices.set(variant.id, amount === null || amount === undefined ? null : Number(amount))
  }
  return prices
}
