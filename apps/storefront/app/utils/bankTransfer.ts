import type { OrderPaymentState } from "./orderStatus"

// The storefront names the bank transfer provider id only here and in the locale files.
export const BANK_TRANSFER_PROVIDER_ID = "pp_bank-transfer_bank-transfer"

// Returns true when the order uses bank transfer, the order is not canceled, and the store has
// not captured the payment.
export function isAwaitingBankTransfer(
  order: { status: string; payment_state?: OrderPaymentState | null } | null | undefined
): boolean {
  const state = order?.payment_state
  return (
    !!state &&
    order.status !== "canceled" &&
    state.provider_id === BANK_TRANSFER_PROVIDER_ID &&
    state.captured_at === null
  )
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
