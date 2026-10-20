import { ORDER_REVIEW_REQUEST_SENT_AT } from "../lib/storefront-metadata"

// The customer gets the review request 7 days after the delivery.
export const REVIEW_REQUEST_DELAY_MS = 7 * 24 * 60 * 60 * 1000

// The job reads only the deliveries of 30 days before the delay. Thus one run never scans all the
// old orders, and the first run after a deploy sends no request for a delivery of long ago.
export const REVIEW_REQUEST_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000

// A limit for one run keeps each run short. The next run takes the remaining orders.
export const REVIEW_REQUEST_BATCH = 100

export type DeliveredOrder = {
  id: string
  status: string
  metadata?: Record<string, unknown> | null
  fulfillments?: { delivered_at?: string | Date | null }[] | null
}

/** Returns the range of delivery times that the job query reads. */
export function reviewWindow(now: Date): { from: Date; to: Date } {
  const to = now.getTime() - REVIEW_REQUEST_DELAY_MS
  return { from: new Date(to - REVIEW_REQUEST_LOOKBACK_MS), to: new Date(to) }
}

// Returns the time of the oldest delivery at or before the cutoff, or null when there is none.
function oldestDelivery(order: DeliveredOrder, cutoff: number): number | null {
  let oldest: number | null = null
  for (const fulfillment of order.fulfillments ?? []) {
    if (!fulfillment?.delivered_at) {
      continue
    }
    const time = new Date(fulfillment.delivered_at).getTime()
    if (Number.isNaN(time) || time > cutoff) {
      continue
    }
    oldest = oldest === null ? time : Math.min(oldest, time)
  }
  return oldest
}

/**
 * Returns the ids of the orders that get a review request now: not cancelled, no mark, and one
 * fulfillment delivered at or before now minus the delay. The oldest delivery comes first. The
 * result has at most REVIEW_REQUEST_BATCH ids.
 */
export function selectDueOrders(orders: DeliveredOrder[], now: Date): string[] {
  const cutoff = now.getTime() - REVIEW_REQUEST_DELAY_MS
  return orders
    .filter((o) => o.status !== "canceled")
    .filter((o) => !o.metadata?.[ORDER_REVIEW_REQUEST_SENT_AT])
    .map((o) => ({ id: o.id, delivered: oldestDelivery(o, cutoff) }))
    .filter((o): o is { id: string; delivered: number } => o.delivered !== null)
    .sort((a, b) => a.delivered - b.delivered)
    .slice(0, REVIEW_REQUEST_BATCH)
    .map((o) => o.id)
}
