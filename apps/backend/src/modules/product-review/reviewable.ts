// The fields of an order that the rules in this file read. Use them in a Query on "order".
export const REVIEW_ORDER_FIELDS: string[] = [
  "id",
  "display_id",
  "items.id",
  "items.product_id",
  "items.product_title",
  "items.variant_title",
  "items.thumbnail",
  "items.detail.shipped_quantity",
]

export type OrderItemForReview = {
  id: string
  product_id: string | null
  product_title: string | null
  variant_title: string | null
  thumbnail: string | null
  detail?: { shipped_quantity?: unknown } | null
}

export type OrderForReview = {
  id: string
  display_id: number
  items?: (OrderItemForReview | null)[] | null
}

export type ReviewableItem = {
  order_id: string
  order_display_id: number
  order_line_item_id: string
  product_id: string
  product_title: string | null
  variant_title: string | null
  thumbnail: string | null
}

// Converts a raw quantity to a number. The Query can return a big number as a text or as an
// object with a "numeric" or a "value" field.
function toNumber(raw: unknown): number {
  let value: unknown = raw
  if (value !== null && typeof value === "object") {
    const record = value as { numeric?: unknown; value?: unknown }
    value = record.numeric ?? record.value
  }
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(result) ? result : 0
}

// Returns the shipped quantity of one order item. An unknown value counts as 0.
export function shippedQuantity(item: OrderItemForReview): number {
  return toNumber(item.detail?.shipped_quantity)
}

// Returns the order item with the given id from the orders of one customer.
export function findOrderItem(
  orders: OrderForReview[],
  orderLineItemId: string
): OrderItemForReview | undefined {
  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (item && item.id === orderLineItemId) {
        return item
      }
    }
  }
  return undefined
}

// Returns the items that the customer can review. An item is reviewable when it has a product,
// its own shipped quantity is more than zero, and it has no review of any status.
export function listReviewableItems(
  orders: OrderForReview[],
  reviewedItemIds: string[]
): ReviewableItem[] {
  const reviewed = new Set(reviewedItemIds)
  const result: ReviewableItem[] = []

  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (!item || item.product_id === null || item.product_id === undefined) {
        continue
      }
      if (shippedQuantity(item) <= 0 || reviewed.has(item.id)) {
        continue
      }
      result.push({
        order_id: order.id,
        order_display_id: order.display_id,
        order_line_item_id: item.id,
        product_id: item.product_id,
        product_title: item.product_title,
        variant_title: item.variant_title,
        thumbnail: item.thumbnail,
      })
    }
  }

  return result
}
