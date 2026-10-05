import { describe, expect, it } from "vitest"
import { findVariant, isPurchasable, variantPrice } from "../../app/utils/variantSelection"

const variant = (id: string, options: Record<string, string>, extra: object = {}) =>
  ({
    id,
    options: Object.entries(options).map(([option_id, value]) => ({ option_id, value })),
    calculated_price: { calculated_amount: 150000 },
    manage_inventory: true,
    allow_backorder: false,
    inventory_quantity: 5,
    ...extra,
  }) as never

const shirt = {
  id: "prod_1",
  variants: [
    variant("variant_s_black", { opt_size: "S", opt_color: "Black" }),
    variant("variant_m_black", { opt_size: "M", opt_color: "Black" }),
  ],
} as never

describe("findVariant", () => {
  it("returns the variant that has each selected option value", () => {
    expect(findVariant(shirt, { opt_size: "M", opt_color: "Black" })?.id).toBe("variant_m_black")
  })

  it("returns null when an option is not selected", () => {
    expect(findVariant(shirt, { opt_size: "M" })).toBeNull()
  })

  it("returns null when no variant has the selected values", () => {
    expect(findVariant(shirt, { opt_size: "M", opt_color: "White" })).toBeNull()
  })

  it("returns null for a product with no variants", () => {
    expect(findVariant({ id: "prod_2", variants: null } as never, {})).toBeNull()
  })
})

describe("isPurchasable", () => {
  it("is true when the variant has stock", () => {
    expect(isPurchasable(variant("v", {}))).toBe(true)
  })

  it("is false when the stock is zero or absent", () => {
    expect(isPurchasable(variant("v", {}, { inventory_quantity: 0 }))).toBe(false)
    expect(isPurchasable(variant("v", {}, { inventory_quantity: undefined }))).toBe(false)
  })

  it("is true when the store does not manage the stock or allows a backorder", () => {
    expect(isPurchasable(variant("v", {}, { manage_inventory: false, inventory_quantity: 0 }))).toBe(
      true
    )
    expect(isPurchasable(variant("v", {}, { allow_backorder: true, inventory_quantity: 0 }))).toBe(
      true
    )
  })
})

describe("variantPrice", () => {
  it("returns the calculated amount", () => {
    expect(variantPrice(variant("v", {}))).toBe(150000)
  })

  it("returns null when there is no variant or no price", () => {
    expect(variantPrice(null)).toBeNull()
    expect(variantPrice(variant("v", {}, { calculated_price: null }))).toBeNull()
  })
})
