import { isBankTransferOrder, isPaymentCaptured, PaymentOrder } from "../lib/bank-transfer-order"
import { PAYMENT_DEADLINE_MS } from "../modules/bank-transfer/constants"

// The job reads only the orders of the last 7 days, so one run never scans the full order table.
export const TIMEOUT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000

// A limit for one run keeps each run short. The next run takes the remaining orders.
export const MAX_CANCELS_PER_RUN = 50

export type TimeoutOrder = PaymentOrder & { id: string; created_at: string | Date }

/** Returns the range of placement times that the job query reads. */
export function timeoutWindow(now: Date): { from: Date; to: Date } {
  return {
    from: new Date(now.getTime() - TIMEOUT_LOOKBACK_MS),
    to: new Date(now.getTime() - PAYMENT_DEADLINE_MS),
  }
}

/**
 * Returns the ids of the unpaid bank transfer orders with no receipt and a passed deadline. The
 * oldest order comes first. The result has at most MAX_CANCELS_PER_RUN ids.
 */
export function selectExpiredOrders(
  orders: TimeoutOrder[],
  receiptCounts: Map<string, number>,
  now: Date
): string[] {
  const deadline = now.getTime() - PAYMENT_DEADLINE_MS
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
