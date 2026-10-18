import { formatRupiah, parseSettingsForm, rangeLabels, toSettingsForm } from "../storefront-form"

const saved = { new_badge_days: 30, low_stock_threshold: 5, price_limits: [250000] }

describe("storefront settings form", () => {
  it("makes the labels of each range in the two languages", () => {
    expect(rangeLabels([200000, 500000])).toEqual([
      { from: null, to: 200000, en: "Under Rp 200.000", id: "Di bawah Rp 200.000" },
      { from: 200000, to: 500000, en: "Rp 200.000 – Rp 500.000", id: "Rp 200.000 – Rp 500.000" },
      { from: 500000, to: null, en: "Over Rp 500.000", id: "Di atas Rp 500.000" },
    ])
    expect(rangeLabels([])).toEqual([])
  })

  it("changes only the field of the saved section", () => {
    const form = { ...toSettingsForm(saved), new_badge_days: "0", low_stock_threshold: "x" }
    expect(parseSettingsForm(form, "new_badge", saved)).toEqual({
      body: { ...saved, new_badge_days: 0 },
      errors: {},
    })
  })

  it.each(["400", "2.5", "-1", ""])("rejects %s days", (value) => {
    const form = { ...toSettingsForm(saved), new_badge_days: value }
    expect(parseSettingsForm(form, "new_badge", saved).errors.new_badge_days).toBe(
      "Enter a whole number from 0 to 365."
    )
  })

  it("rejects a low stock threshold above 999", () => {
    const form = { ...toSettingsForm(saved), low_stock_threshold: "1000" }
    expect(parseSettingsForm(form, "low_stock", saved).errors.low_stock_threshold).toBe(
      "Enter a whole number from 0 to 999."
    )
  })

  it("shows an error on each range whose To is not above its From", () => {
    const form = { ...toSettingsForm(saved), limits: ["250.000", "200000", ""] }
    const result = parseSettingsForm(form, "price_ranges", saved)
    expect(result.body).toBeNull()
    expect(result.errors.limits).toEqual({
      1: "Enter an amount higher than Rp 250.000.",
      2: "Enter an amount higher than Rp 200.000.",
    })
  })

  it("accepts amounts with dots", () => {
    const form = { ...toSettingsForm(saved), limits: ["250.000", "1.000.000"] }
    expect(parseSettingsForm(form, "price_ranges", saved).body?.price_limits).toEqual([
      250000, 1000000,
    ])
    expect(formatRupiah(1000000)).toBe("Rp 1.000.000")
  })
})
