// One email in 24 hours for one wishlist item, so a stock level that goes up and down does not
// send many emails.
export const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000

export type StockItem = {
  id: string
  wishlist_id: string
  available: boolean
  alerted_at: Date | string | null
}

function inCooldown(item: StockItem, now: Date): boolean {
  if (item.alerted_at === null) {
    return false
  }
  return now.getTime() - new Date(item.alerted_at).getTime() < ALERT_COOLDOWN_MS
}

/**
 * Returns the wishlist items to alert and the `available` updates for one variant. An item in
 * the cooldown gets no update, so it keeps `available: false` and a later event can alert it.
 */
export function transitionStockItems<T extends StockItem>(
  items: T[],
  inStockNow: boolean,
  now: Date
): { alerts: T[]; updates: { id: string; available: boolean }[] } {
  const alerts: T[] = []
  const updates: { id: string; available: boolean }[] = []
  for (const item of items) {
    if (inStockNow && !item.available) {
      if (inCooldown(item, now)) {
        continue
      }
      alerts.push(item)
      updates.push({ id: item.id, available: true })
    } else if (!inStockNow && item.available) {
      updates.push({ id: item.id, available: false })
    }
  }
  return { alerts, updates }
}
