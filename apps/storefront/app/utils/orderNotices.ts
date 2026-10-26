// The value that the job `cancel-unpaid-orders` writes into metadata.cancel_reason.
const PAYMENT_TIMEOUT = "payment_timeout"

// Returns the key of the cancel text. A cancel by the store writes no reason.
export function cancelNoticeKey(
  cancelReason: string | null | undefined
): "order.cancelledTimeout" | "order.cancelledByStore" {
  return cancelReason === PAYMENT_TIMEOUT ? "order.cancelledTimeout" : "order.cancelledByStore"
}

// Returns the total of the refunds of the order, in whole rupiah. The Store order route does not
// return the refunds of a payment collection, so the value comes from the order summary. The Store
// API can send an amount as a string, and a value that is not a number counts as 0.
export function refundedAmount(order: {
  summary?: { refunded_total?: number | string | null } | null
}): number {
  const amount = Number(order.summary?.refunded_total ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

// Returns the wa.me link of a WhatsApp number. wa.me takes the number as digits only, with the
// country code.
export function whatsappHref(number: string | null | undefined): string | null {
  const digits = (number ?? "").replace(/\D/g, "")
  return digits ? `https://wa.me/${digits}` : null
}
