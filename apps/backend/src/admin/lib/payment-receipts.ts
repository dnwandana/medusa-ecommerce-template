// The admin bundle must not import server code, so these values are copies. The sources are
// MAX_RECEIPTS and MAX_NOTE_LENGTH in modules/payment-receipt/constants.ts, and
// BANK_TRANSFER_PROVIDER_ID in modules/bank-transfer/constants.ts.
const MAX_RECEIPTS = 3
const MAX_NOTE_LENGTH = 500
const BANK_TRANSFER_PROVIDER_ID = "pp_bank-transfer_bank-transfer"

export type WidgetOrder = {
  status: string
  payment_collections?: Array<{
    status?: string | null
    payment_sessions?: Array<{ provider_id: string }> | null
    payments?: Array<{ provider_id: string; captured_at?: string | null }> | null
  }> | null
}

export type WidgetActions = { accept: boolean; askForMore: boolean; cancel: boolean }

/** Returns true when a session or a payment of the order uses the bank transfer provider. */
export function isBankTransferOrder(order: WidgetOrder): boolean {
  return (order.payment_collections ?? []).some(
    (c) =>
      (c.payment_sessions ?? []).some((s) => s.provider_id === BANK_TRANSFER_PROVIDER_ID) ||
      (c.payments ?? []).some((p) => p.provider_id === BANK_TRANSFER_PROVIDER_ID)
  )
}

function isPaymentCaptured(order: WidgetOrder): boolean {
  return (order.payment_collections ?? []).some(
    (c) => c.status === "completed" || (c.payments ?? []).some((p) => !!p.captured_at)
  )
}

/** Returns the grid class that gives the receipts the full width of the widget together. */
export function receiptColumnClass(count: number): string {
  if (count >= 3) {
    return "col-span-4"
  }
  return count === 2 ? "col-span-6" : "col-span-12"
}

/** Returns the header text of the widget, for example "2 of 3 receipts". */
export function receiptCountLabel(count: number): string {
  if (count === 0) {
    return "No receipts yet"
  }
  return `${count} of ${MAX_RECEIPTS} receipts`
}

/** Returns the actions that the owner can use. All stop after the cancellation or the capture. */
export function widgetActions(order: WidgetOrder): WidgetActions {
  const open = order.status !== "canceled" && !isPaymentCaptured(order)
  return { accept: open, askForMore: open, cancel: open }
}

/** Returns the error text for a note that POST .../receipts/ask-for-more refuses, or null. */
export function validateNote(note: string): string | null {
  // The route trims the note before the length check, so this check does the same.
  const trimmed = note.trim()
  if (!trimmed) {
    return "Write a note for the customer."
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return `Write at most ${MAX_NOTE_LENGTH} characters.`
  }
  return null
}

/** Returns the Admin API path of the receipt image. */
export function receiptFileUrl(receiptId: string): string {
  return `/admin/payment-receipts/${encodeURIComponent(receiptId)}/file`
}
