import { isBankTransferOrder, isPaymentCaptured, PaymentOrder } from "../lib/bank-transfer-order"

// The job reads only the orders of a limited window, so one run never scans the full order table.
// The window starts this margin before the deadline. Thus the window is always longer than the
// deadline, and the default deadline of 24 hours gives a window of 7 days.
export const TIMEOUT_LOOKBACK_MARGIN_MS = 6 * 24 * 60 * 60 * 1000

// A limit for one run keeps each run short. The next run takes the remaining orders.
export const MAX_CANCELS_PER_RUN = 50

export type TimeoutOrder = PaymentOrder & { id: string; created_at: string | Date }

/** Returns the range of placement times that the job query reads. */
export function timeoutWindow(now: Date, deadlineMs: number): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() - (deadlineMs + TIMEOUT_LOOKBACK_MARGIN_MS)),
    to: new Date(now.getTime() - deadlineMs),
  }
}

/**
 * Returns the ids of the unpaid bank transfer orders with no receipt and a passed deadline. The
 * oldest order comes first. The result has at most MAX_CANCELS_PER_RUN ids.
 */
export function selectExpiredOrders(
  orders: TimeoutOrder[],
  receiptCounts: Map<string, number>,
  now: Date,
  deadlineMs: number
): string[] {
  const deadline = now.getTime() - deadlineMs
  return (
    orders
      // The receipt rule comes first. After the first receipt, no other rule can cancel the order.
      .filter((o) => (receiptCounts.get(o.id) ?? 0) === 0)
      .filter((o) => isBankTransferOrder(o))
      .filter((o) => o.status !== "canceled")
      .filter((o) => !isPaymentCaptured(o))
      .map((o) => ({ id: o.id, placed: new Date(o.created_at).getTime() }))
      .filter((o) => o.placed <= deadline)
      .sort((a, b) => a.placed - b.placed)
      .slice(0, MAX_CANCELS_PER_RUN)
      .map((o) => o.id)
  )
}
