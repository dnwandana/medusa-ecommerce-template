import type { HttpTypes } from "@medusajs/types"

// The storefront names the bank transfer provider id only here and in the locale files.
export const BANK_TRANSFER_PROVIDER_ID = "pp_bank-transfer_bank-transfer"

// The customer must pay within 24 hours of the order time.
const PAYMENT_DEADLINE_MS = 24 * 60 * 60 * 1000

// Returns true when the order uses bank transfer and the store has not captured the payment.
export function isAwaitingBankTransfer(order: HttpTypes.StoreOrder): boolean {
  return (order.payment_collections ?? []).some(
    (collection) =>
      collection.status === "authorized" &&
      (collection.payment_sessions ?? []).some(
        (session) => session.provider_id === BANK_TRANSFER_PROVIDER_ID
      )
  )
}

// Returns the payment deadline: the order time plus 24 hours.
export function bankTransferDeadline(placedAt: string | Date): Date {
  return new Date(new Date(placedAt).getTime() + PAYMENT_DEADLINE_MS)
}

// Returns the deadline in WIB, for example "18 October 2026, 14:30 WIB".
// The text is built from the parts, because the joining words differ between ICU versions.
export function formatDeadline(date: Date, locale: string): string {
  const isIndonesian = locale === "id"
  const parts = new Intl.DateTimeFormat(isIndonesian ? "id-ID" : "en-GB", {
    // The store is in Jakarta. Thus the deadline does not change with the browser time zone.
    timeZone: "Asia/Jakarta",
    hourCycle: "h23",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? ""
  const separator = isIndonesian ? "." : ":"
  return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}${separator}${part("minute")} WIB`
}
