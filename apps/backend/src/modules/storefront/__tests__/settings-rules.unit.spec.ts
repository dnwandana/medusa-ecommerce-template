import {
  STOREFRONT_DEFAULTS,
  isHexColour,
  normalizePriceLimits,
  resolveSettings,
} from "../settings-rules"

describe("storefront settings rules", () => {
  it("gives the defaults when staff saved no value", () => {
    expect(resolveSettings(null)).toEqual({
      new_badge_days: 30,
      low_stock_threshold: 5,
      price_limits: [],
    })
    expect(STOREFRONT_DEFAULTS.new_badge_days).toBe(30)
  })

  it("keeps 0, which turns a badge off", () => {
    expect(
      resolveSettings({ new_badge_days: 0, low_stock_threshold: 0, price_limits: null })
    ).toEqual({ new_badge_days: 0, low_stock_threshold: 0, price_limits: [] })
  })

  it("gives the default for a number out of range", () => {
    const row = { new_badge_days: 366, low_stock_threshold: 1000, price_limits: [] }
    expect(resolveSettings(row)).toEqual(STOREFRONT_DEFAULTS)
  })

  it("sorts the price limits and removes duplicates and bad values", () => {
    expect(normalizePriceLimits([500000, 200000, 500000, 0, -1, 1.5, "x"])).toEqual([
      200000, 500000,
    ])
    expect(normalizePriceLimits("x")).toEqual([])
  })

  it("checks a hex colour", () => {
    expect(isHexColour("#9aa68c")).toBe(true)
    expect(isHexColour("#9AA68C")).toBe(true)
    expect(isHexColour("9aa68c")).toBe(false)
    expect(isHexColour("#fff")).toBe(false)
  })
})
