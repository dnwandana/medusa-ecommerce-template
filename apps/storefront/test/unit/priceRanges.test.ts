import { describe, expect, it } from "vitest"
import { findPriceRange, priceRangeLabel, priceRangeQuery, priceRanges } from "~/utils/priceRanges"

const en: Record<string, string> = {
  "listing.priceUnder": "Under {price}",
  "listing.priceBetween": "{from} to {to}",
  "listing.priceOver": "Over {price}",
}
const t = (key: string, params: Record<string, string>) =>
  en[key]!.replace(/\{(\w+)\}/g, (_, name: string) => params[name]!)

describe("price ranges", () => {
  it("makes N + 1 ranges from N limits, sorted, with no duplicate", () => {
    expect(priceRanges([1000000, 500000, 500000, 0, 1.5]).map((range) => range.key)).toEqual([
      "0-500000",
      "500000-1000000",
      "1000000-",
    ])
    expect(priceRanges([])).toEqual([])
  })

  it("labels each range with the price format of the shopper", () => {
    const labels = priceRanges([500000, 1000000]).map((range) => priceRangeLabel(range, t))
    expect(labels).toEqual(["Under Rp 500.000", "Rp 500.000 to Rp 1.000.000", "Over Rp 1.000.000"])
  })

  it("ignores a key that the settings do not have", () => {
    expect(findPriceRange([500000], "0-500000")).toEqual({ key: "0-500000", from: 0, to: 500000 })
    expect(findPriceRange([500000], "0-200000")).toBeNull()
    expect(findPriceRange([500000], null)).toBeNull()
  })

  it("sends only the bounds that the range has", () => {
    const [first, middle, last] = priceRanges([500000, 1000000])
    expect(priceRangeQuery(first!)).toEqual({ price_to: 500000 })
    expect(priceRangeQuery(middle!)).toEqual({ price_from: 500000, price_to: 1000000 })
    expect(priceRangeQuery(last!)).toEqual({ price_from: 1000000 })
    expect(priceRangeQuery(null)).toEqual({})
  })
})
