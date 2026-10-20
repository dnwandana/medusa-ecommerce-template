// The key list stays in one file. This module gives the key again for the low stock code.
export { INVENTORY_LOW_STOCK_ALERTED_AT } from "../lib/storefront-metadata"

export type LowStockInput = {
  available: number
  threshold: number
  manage_inventory: boolean
  // The metadata value is not typed. Any value that is not empty counts as a mark.
  alerted_at: unknown
}

/**
 * Returns "alert" when the stock crosses the threshold with no mark, "reset" when the stock is
 * above the threshold with a mark, and "none" in all other cases.
 */
export function lowStockTransition(input: LowStockInput): "alert" | "reset" | "none" {
  // A threshold of 0 turns the email off. An untracked variant has no stock number to compare.
  if (input.threshold <= 0 || !input.manage_inventory) {
    return "none"
  }
  const marked = Boolean(input.alerted_at)
  if (input.available <= input.threshold && !marked) {
    return "alert"
  }
  if (input.available > input.threshold && marked) {
    return "reset"
  }
  return "none"
}
