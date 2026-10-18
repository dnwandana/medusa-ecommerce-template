const DAY_MS = 24 * 60 * 60 * 1000

// Returns the time since the date in words, for example "2 weeks ago" or "today".
// A date in the future gives "today".
export function relativeTime(date: string | Date, locale: string, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - new Date(date).getTime()) / DAY_MS)
  if (days < 1) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day")
  }
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "always" })
  if (days < 7) {
    return format.format(-days, "day")
  }
  if (days < 30) {
    return format.format(-Math.floor(days / 7), "week")
  }
  if (days < 365) {
    return format.format(-Math.floor(days / 30), "month")
  }
  return format.format(-Math.floor(days / 365), "year")
}
