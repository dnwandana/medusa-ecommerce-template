// The rules for the storefront settings. This file has no Medusa import, so that the admin
// helpers can use the same rules.

export type StorefrontSettings = {
  new_badge_days: number
  low_stock_threshold: number
  price_limits: number[]
}

export type StorefrontSettingRow = {
  new_badge_days: number | null
  low_stock_threshold: number | null
  price_limits: unknown
}

export const NEW_BADGE_DAYS_MAX = 365
export const LOW_STOCK_MAX = 999

export const STOREFRONT_DEFAULTS: StorefrontSettings = {
  new_badge_days: 30,
  low_stock_threshold: 5,
  price_limits: [],
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/i

// Returns the value when it is a whole number from 0 to max. Otherwise returns the fallback.
// 0 is a valid value, because 0 turns the badge off.
function wholeNumberInRange(value: number | null, max: number, fallback: number): number {
  if (value === null || !Number.isInteger(value) || value < 0 || value > max) {
    return fallback
  }
  return value
}

// Returns the price limits as whole numbers above 0, with no duplicates, from low to high.
// N limits make N + 1 price ranges in the storefront.
export function normalizePriceLimits(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }
  const limits = value.filter(
    (item): item is number => typeof item === "number" && Number.isInteger(item) && item > 0
  )
  return [...new Set(limits)].sort((a, b) => a - b)
}

// Returns the settings of the row. A missing row or a bad field gives the default.
export function resolveSettings(row: StorefrontSettingRow | null): StorefrontSettings {
  if (!row) {
    return { ...STOREFRONT_DEFAULTS, price_limits: [] }
  }
  return {
    new_badge_days: wholeNumberInRange(
      row.new_badge_days,
      NEW_BADGE_DAYS_MAX,
      STOREFRONT_DEFAULTS.new_badge_days
    ),
    low_stock_threshold: wholeNumberInRange(
      row.low_stock_threshold,
      LOW_STOCK_MAX,
      STOREFRONT_DEFAULTS.low_stock_threshold
    ),
    price_limits: normalizePriceLimits(row.price_limits),
  }
}

// Returns true for a six-digit hex colour, for example "#9aa68c".
export function isHexColour(value: string): boolean {
  return HEX_COLOUR.test(value)
}
