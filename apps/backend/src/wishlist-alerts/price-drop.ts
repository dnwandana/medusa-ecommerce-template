// A limit for one run keeps each run short. The next run takes the remaining items.
export const PRICE_DROP_BATCH = 500

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Returns the first item of the batch for the day of `now`. The batch moves one batch forward each
 * day, so a store with more items than one batch gets a check of every item over some days.
 */
export function batchOffset(count: number, now: Date): number {
  if (count <= PRICE_DROP_BATCH) {
    return 0
  }
  const day = Math.floor(now.getTime() / DAY_MS)
  return (day * PRICE_DROP_BATCH) % count
}

export type PriceItem = {
  id: string
  wishlist_id: string
  product_variant_id: string
  saved_unit_price: number | null
}

/**
 * Returns the price drops and the saved price updates. The saved price changes only on a drop or
 * when it is null. Thus a rise followed by a smaller drop gives no alert.
 */
export function selectPriceDrops<T extends PriceItem>(
  items: T[],
  prices: Map<string, number | null>
): {
  drops: { item: T; old_price: number; new_price: number }[]
  updates: { id: string; saved_unit_price: number }[]
} {
  const drops: { item: T; old_price: number; new_price: number }[] = []
  const updates: { id: string; saved_unit_price: number }[] = []
  for (const item of items) {
    const current = prices.get(item.product_variant_id)
    // A variant with no price in the region gives no information. The saved price stays.
    if (current === null || current === undefined) {
      continue
    }
    if (item.saved_unit_price === null) {
      updates.push({ id: item.id, saved_unit_price: current })
    } else if (current < item.saved_unit_price) {
      drops.push({ item, old_price: item.saved_unit_price, new_price: current })
      updates.push({ id: item.id, saved_unit_price: current })
    }
  }
  return { drops, updates }
}
