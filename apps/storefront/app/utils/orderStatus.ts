import { BANK_TRANSFER_PROVIDER_ID } from "./bankTransfer"

// The statuses that the customer sees. Each status has the locale key `order.status.<status>`.
export type CustomerStatus =
  | "waiting_for_payment"
  | "payment_submitted"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

// One entry of the answer of `GET /store/payment-states`. It has no file key and no file URL.
export type OrderPaymentState = {
  order_id: string
  provider_id: string | null
  captured_at: string | null
  receipts: Array<{ id: string; file_name: string; created_at: string }>
  note: { note: string; created_at: string } | null
}

// The fields of an order that `customerStatus` reads.
export type StatusOrder = {
  status: string
  payment_status?: string | null
  fulfillment_status?: string | null
  payment_state?: OrderPaymentState | null
}

export type ReceiptPhase = "none" | "submitted" | "more"

const SHIPPED_FULFILLMENT = ["shipped", "partially_shipped", "partially_delivered"]

const time = (value: string): number => new Date(value).getTime()

// Returns "more" when the store asked for more payment after the newest receipt. The comparison
// uses Date values, because two ISO strings with different formats do not sort as text.
export function receiptPhase(state: OrderPaymentState): ReceiptPhase {
  const newestReceipt = Math.max(...state.receipts.map((receipt) => time(receipt.created_at)))
  if (state.note) {
    return state.receipts.length === 0 || time(state.note.created_at) > newestReceipt
      ? "more"
      : "submitted"
  }
  return state.receipts.length === 0 ? "none" : "submitted"
}

// Returns the status that the customer sees. The rules apply in this order. A gateway order and
// an authorized gateway payment give "processing".
export function customerStatus(order: StatusOrder): CustomerStatus {
  if (order.status === "canceled") return "cancelled"
  if (order.payment_status === "refunded") return "refunded"

  const fulfillmentStatus = order.fulfillment_status ?? ""
  if (fulfillmentStatus === "delivered") return "delivered"
  if (SHIPPED_FULFILLMENT.includes(fulfillmentStatus)) return "shipped"

  const state = order.payment_state
  if (state && state.provider_id === BANK_TRANSFER_PROVIDER_ID && state.captured_at === null) {
    return receiptPhase(state) === "submitted" ? "payment_submitted" : "waiting_for_payment"
  }
  return "processing"
}
