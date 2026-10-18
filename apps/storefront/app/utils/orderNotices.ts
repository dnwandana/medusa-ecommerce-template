// The value that the 24-hour job of payment base part 2 writes into metadata.cancel_reason.
const PAYMENT_TIMEOUT = "payment_timeout"

// Returns the key of the cancel text. A cancel by the store writes no reason.
export function cancelNoticeKey(
  cancelReason: string | null | undefined
): "order.cancelledTimeout" | "order.cancelledByStore" {
  return cancelReason === PAYMENT_TIMEOUT ? "order.cancelledTimeout" : "order.cancelledByStore"
}

// Returns the sum of the refunds of all payment collections, in whole rupiah. The Store API can
// send an amount as a string, and a value that is not a number counts as 0.
export function refundedAmount(order: {
  payment_collections?: { refunded_amount?: number | string | null }[] | null
}): number {
  return (order.payment_collections ?? []).reduce((sum, collection) => {
    const amount = Number(collection.refunded_amount ?? 0)
    return Number.isFinite(amount) ? sum + amount : sum
  }, 0)
}

// Returns the wa.me link of a WhatsApp number. wa.me takes the number as digits only, with the
// country code.
export function whatsappHref(number: string | null | undefined): string | null {
  const digits = (number ?? "").replace(/\D/g, "")
  return digits ? `https://wa.me/${digits}` : null
}
