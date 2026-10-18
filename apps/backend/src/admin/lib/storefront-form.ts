import { LOW_STOCK_MAX, NEW_BADGE_DAYS_MAX } from "../../modules/storefront/settings-rules"

export type StorefrontSettingsBody = {
  new_badge_days: number
  low_stock_threshold: number
  price_limits: number[]
}

// `limits` holds the "To" amount of each price range except the last. The last range has no
// maximum, so it has no field.
export type SettingsForm = { new_badge_days: string; low_stock_threshold: string; limits: string[] }

export type SettingsSection = "new_badge" | "low_stock" | "price_ranges"

export type SettingsErrors = {
  new_badge_days?: string
  low_stock_threshold?: string
  limits?: Record<number, string>
}

export type PriceRange = { from: number | null; to: number | null; en: string; id: string }

const WHOLE_NUMBER = /^\d+$/

/** Returns an amount in whole rupiah with dots between the thousands, for example "Rp 250.000". */
export function formatRupiah(amount: number): string {
  return `Rp ${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

/** Returns the amount without the dots and the spaces, or null when it is not a whole amount. */
export function parseAmount(value: string): number | null {
  const digits = value.replace(/[.\s]/g, "")
  if (!WHOLE_NUMBER.test(digits)) {
    return null
  }
  const amount = Number(digits)
  return Number.isSafeInteger(amount) ? amount : null
}

/** Returns the form values of the saved settings. */
export function toSettingsForm(settings: StorefrontSettingsBody): SettingsForm {
  return {
    new_badge_days: String(settings.new_badge_days),
    low_stock_threshold: String(settings.low_stock_threshold),
    limits: settings.price_limits.map((limit) => formatRupiah(limit).slice(3)),
  }
}

function parseWholeNumber(value: string, max: number): number | null {
  const text = value.trim()
  if (!WHOLE_NUMBER.test(text)) {
    return null
  }
  const number = Number(text)
  return number <= max ? number : null
}

/**
 * Returns the "From" amount of each row. It is the "To" of the row above, or 0 for the first row.
 * When the row above has no valid amount, the "From" of that row carries down.
 */
function rowStarts(limits: (number | null)[]): number[] {
  const starts: number[] = []
  let from = 0
  for (const limit of limits) {
    starts.push(from)
    if (limit !== null) {
      from = limit
    }
  }
  return starts
}

/**
 * Returns the body of POST /admin/storefront/settings for one section. The body is the saved
 * settings with only the field of that section replaced, so a Save does not send the unsaved
 * values of the other sections. The body is null when the field has an error.
 */
export function parseSettingsForm(
  form: SettingsForm,
  section: SettingsSection,
  saved: StorefrontSettingsBody
): { body: StorefrontSettingsBody | null; errors: SettingsErrors } {
  if (section === "new_badge") {
    const days = parseWholeNumber(form.new_badge_days, NEW_BADGE_DAYS_MAX)
    return days === null
      ? { body: null, errors: { new_badge_days: "Enter a whole number from 0 to 365." } }
      : { body: { ...saved, new_badge_days: days }, errors: {} }
  }

  if (section === "low_stock") {
    const threshold = parseWholeNumber(form.low_stock_threshold, LOW_STOCK_MAX)
    return threshold === null
      ? { body: null, errors: { low_stock_threshold: "Enter a whole number from 0 to 999." } }
      : { body: { ...saved, low_stock_threshold: threshold }, errors: {} }
  }

  const limits = form.limits.map(parseAmount)
  const starts = rowStarts(limits)
  const limitErrors: Record<number, string> = {}
  limits.forEach((limit, index) => {
    if (limit === null || limit <= starts[index]) {
      limitErrors[index] = `Enter an amount higher than ${formatRupiah(starts[index])}.`
    }
  })
  if (Object.keys(limitErrors).length > 0) {
    return { body: null, errors: { limits: limitErrors } }
  }
  return { body: { ...saved, price_limits: limits as number[] }, errors: {} }
}

/**
 * Returns the price range from `from` to `to` with the storefront labels in English and Bahasa
 * Indonesia. A range includes its `from` and excludes its `to`. A null `from` is the first range,
 * and a null `to` is the last range.
 */
export function rangeLabel(from: number | null, to: number | null): PriceRange {
  if (to === null) {
    const over = formatRupiah(from ?? 0)
    return { from, to, en: `Over ${over}`, id: `Di atas ${over}` }
  }
  if (from === null) {
    const under = formatRupiah(to)
    return { from, to, en: `Under ${under}`, id: `Di bawah ${under}` }
  }
  const label = `${formatRupiah(from)} – ${formatRupiah(to)}`
  return { from, to, en: label, id: label }
}

/** Returns the price ranges of the sorted limits. N limits give N + 1 ranges. */
export function rangeLabels(limits: number[]): PriceRange[] {
  if (limits.length === 0) {
    return []
  }
  return [null, ...limits].map((from, index) =>
    rangeLabel(from, index < limits.length ? limits[index] : null)
  )
}
