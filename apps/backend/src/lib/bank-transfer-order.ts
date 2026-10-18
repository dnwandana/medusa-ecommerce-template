import { BANK_TRANSFER_PROVIDER_ID } from "../modules/bank-transfer/constants"
import { MAX_RECEIPTS } from "../modules/payment-receipt/constants"

type PaymentRow = {
  id: string
  provider_id: string
  captured_at?: string | Date | null
  canceled_at?: string | Date | null
}

type PaymentCollectionRow = {
  status?: string | null
  payment_sessions?: Array<{ provider_id: string }> | null
  payments?: PaymentRow[] | null
}

/** The order fields that the payment rules read. Query can give null for each relation. */
export type PaymentOrder = {
  status: string
  created_at?: string | Date
  payment_collections?: Array<PaymentCollectionRow | null> | null
}

export type ReceiptBlock = "not_bank_transfer" | "cancelled" | "captured" | "limit"

export const RECEIPT_BLOCK_MESSAGES: Record<ReceiptBlock, string> = {
  not_bank_transfer: "This order is not paid by bank transfer.",
  cancelled: "This order is cancelled.",
  captured: "The store already confirmed the payment of this order.",
  limit: `You uploaded ${MAX_RECEIPTS} receipts. Contact the store to send another receipt.`,
}

function collections(order: PaymentOrder): PaymentCollectionRow[] {
  return (order.payment_collections ?? []).filter((c): c is PaymentCollectionRow => !!c)
}

function payments(order: PaymentOrder): PaymentRow[] {
  return collections(order).flatMap((c) => c.payments ?? [])
}

/** Returns true when a session or a payment of the order uses the bank transfer provider. */
export function isBankTransferOrder(order: PaymentOrder): boolean {
  return collections(order).some(
    (c) =>
      (c.payment_sessions ?? []).some((s) => s.provider_id === BANK_TRANSFER_PROVIDER_ID) ||
      (c.payments ?? []).some((p) => p.provider_id === BANK_TRANSFER_PROVIDER_ID)
  )
}

/** Returns true when a payment of the order is captured or a collection is completed. */
export function isPaymentCaptured(order: PaymentOrder): boolean {
  return (
    payments(order).some((p) => !!p.captured_at) ||
    collections(order).some((c) => c.status === "completed")
  )
}

/** Returns the id of the open bank transfer payment, or null when no such payment exists. */
export function capturablePaymentId(order: PaymentOrder): string | null {
  const payment = payments(order).find(
    (p) => p.provider_id === BANK_TRANSFER_PROVIDER_ID && !p.captured_at && !p.canceled_at
  )
  return payment?.id ?? null
}

/** Returns the reason that the customer cannot upload a receipt, or null when the upload is open. */
export function receiptBlockReason(order: PaymentOrder, receiptCount: number): ReceiptBlock | null {
  // The bank transfer rule comes first, so a gateway order never gets the "limit" message.
  if (!isBankTransferOrder(order)) {
    return "not_bank_transfer"
  }
  if (order.status === "canceled") {
    return "cancelled"
  }
  if (isPaymentCaptured(order)) {
    return "captured"
  }
  if (receiptCount >= MAX_RECEIPTS) {
    return "limit"
  }
  return null
}
