import type { HttpTypes } from "@medusajs/types"

type SavingsLine = Pick<
  HttpTypes.StoreCartLineItem,
  "unit_price" | "compare_at_unit_price" | "quantity"
>

// Returns the sum that the sale prices save, in whole rupiah. The subtotal already uses the sale
// prices, so the sum is information only. A line with no higher compare-at price adds 0.
export function cartSavings(items: SavingsLine[] | null | undefined): number {
  return (items ?? []).reduce((sum, item) => {
    const compare = item.compare_at_unit_price
    if (typeof compare !== "number" || compare <= item.unit_price) {
      return sum
    }
    return sum + (compare - item.unit_price) * item.quantity
  }, 0)
}
