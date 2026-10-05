import { describe, expect, it } from "vitest"
import { formatPrice } from "../../app/utils/formatPrice"

describe("formatPrice", () => {
  it("formats an amount as Rupiah with no decimals", () => {
    expect(formatPrice(150000)).toBe("Rp 150.000")
    expect(formatPrice(85000)).toBe("Rp 85.000")
    expect(formatPrice(1250000)).toBe("Rp 1.250.000")
  })

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("Rp 0")
  })

  it("rounds an amount with decimals", () => {
    expect(formatPrice(9999.6)).toBe("Rp 10.000")
  })

  it("uses a plain space after Rp", () => {
    expect(formatPrice(1000).charCodeAt(2)).toBe(32)
  })

  // Review Focus: a variant with no price must not show "Rp NaN".
  it("returns a dash when there is no amount", () => {
    expect(formatPrice(null)).toBe("-")
    expect(formatPrice(undefined)).toBe("-")
    expect(formatPrice(Number.NaN)).toBe("-")
  })
})
