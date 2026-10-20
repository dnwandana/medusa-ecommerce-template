import type { EmailLocale } from "./i18n"

export type RenderedEmail = { subject: string; html: string }

// Makes a value safe for HTML text and for an attribute in double quotation marks.
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Formats whole rupiah, for example "Rp 150.000". It does not use Intl, so the result
// is the same on all Node builds.
export function formatRupiah(amount: unknown): string {
  const number = Number(amount)
  const whole = Number.isFinite(number) ? Math.round(number) : 0
  return `Rp ${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
}

// en-GB gives the day before the month, as in "21 October 2026". The formats are made one time,
// because each new Intl.DateTimeFormat is slow.
const WIB_FORMATS: Record<EmailLocale, { date: Intl.DateTimeFormat; time: Intl.DateTimeFormat }> = {
  "en-US": {
    date: new Intl.DateTimeFormat("en-GB", DATE_OPTIONS),
    time: new Intl.DateTimeFormat("en-GB", {
      ...DATE_OPTIONS,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }),
  },
  "id-ID": {
    date: new Intl.DateTimeFormat("id-ID", DATE_OPTIONS),
    time: new Intl.DateTimeFormat("id-ID", {
      ...DATE_OPTIONS,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }),
  },
}

// Returns the parts of a date by type. The callers build the text from the parts, because the
// words and the marks that join the parts differ between ICU versions.
function partsOf(format: Intl.DateTimeFormat, date: Date): Record<string, string> {
  const parts: Record<string, string> = {}
  for (const part of format.formatToParts(date)) {
    parts[part.type] = part.value
  }
  return parts
}

// Formats a date in WIB (Asia/Jakarta), for example "21 October 2026" or "21 Oktober 2026".
export function formatWibDate(date: Date, locale: EmailLocale = "en-US"): string {
  const parts = partsOf(WIB_FORMATS[locale].date, date)
  return `${parts.day} ${parts.month} ${parts.year}`
}

// Formats a time in WIB with a 24-hour clock, for example "21 October 2026, 14:30 WIB". Indonesian
// uses a dot between the hour and the minute: "21 Oktober 2026, 14.30 WIB".
export function formatWibTime(date: Date, locale: EmailLocale = "en-US"): string {
  const parts = partsOf(WIB_FORMATS[locale].time, date)
  const separator = locale === "id-ID" ? "." : ":"
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}${separator}${parts.minute} WIB`
}
