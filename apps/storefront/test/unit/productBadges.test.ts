import { describe, expect, it } from "vitest"
import { STOREFRONT_DEFAULTS } from "../../app/types/storefront"
import {
  isLimitedStock,
  isNewProduct,
  priceView,
  productBadge,
} from "../../app/utils/productBadges"

const NOW = new Date("2026-10-18T00:00:00Z")
const variant = (quantity: number, price = 389000, original = price, extra = {}) => ({
  id: `v_${quantity}_${price}`,
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: quantity,
  calculated_price: { calculated_amount: price, original_amount: original },
  ...extra,
})
const product = (variants: object[], created = "2026-01-01T00:00:00Z") =>
  ({ id: "prod_1", created_at: created, variants }) as any

describe("product badges", () => {
  it("shows Limited stock for a total stock from 1 to the threshold", () => {
    expect(isLimitedStock([variant(2), variant(3)] as any, 5)).toBe(true)
    expect(isLimitedStock([variant(3), variant(3)] as any, 5)).toBe(false)
    expect(isLimitedStock([variant(2)] as any, 0)).toBe(false)
  })

  it("never shows Limited stock when a variant does not track stock or allows backorders", () => {
    expect(
      isLimitedStock([variant(1), variant(0, 1, 1, { manage_inventory: false })] as any, 5)
    ).toBe(false)
    expect(isLimitedStock([variant(1, 1, 1, { allow_backorder: true })] as any, 5)).toBe(false)
  })

  it("counts a variant with no stock value as 0", () => {
    expect(isLimitedStock([variant(0, 1, 1, { inventory_quantity: undefined })] as any, 5)).toBe(
      false
    )
    expect(isLimitedStock([], 5)).toBe(false)
  })

  it("shows New within the number of days and never for 0 days", () => {
    expect(isNewProduct("2026-10-01T00:00:00Z", 30, NOW)).toBe(true)
    expect(isNewProduct("2026-09-01T00:00:00Z", 30, NOW)).toBe(false)
    expect(isNewProduct("2026-10-17T00:00:00Z", 0, NOW)).toBe(false)
    expect(isNewProduct(null, 30, NOW)).toBe(false)
  })

  it("gives the sale price, the old price and the percentage of the lowest variant", () => {
    expect(priceView([variant(5, 389000, 389000), variant(5, 311200, 389000)] as any)).toEqual({
      amount: 311200,
      original: 389000,
      percent: 20,
    })
    expect(priceView([variant(5, 389000)] as any)).toEqual({
      amount: 389000,
      original: null,
      percent: null,
    })
    expect(priceView([])).toEqual({ amount: null, original: null, percent: null })
  })

  it("keeps the order Sold out, Limited stock, Sale, New", () => {
    const settings = STOREFRONT_DEFAULTS
    expect(productBadge(product([variant(0)], "2026-10-17T00:00:00Z"), settings, NOW)).toBe(
      "soldOut"
    )
    expect(productBadge(product([variant(2, 1, 2)], "2026-10-17T00:00:00Z"), settings, NOW)).toBe(
      "limited"
    )
    expect(productBadge(product([variant(9, 1, 2)], "2026-10-17T00:00:00Z"), settings, NOW)).toBe(
      "sale"
    )
    expect(productBadge(product([variant(9)], "2026-10-17T00:00:00Z"), settings, NOW)).toBe("new")
    expect(productBadge(product([variant(9)]), settings, NOW)).toBeNull()
    expect(productBadge(product([]), settings, NOW)).toBe("soldOut")
  })
})
