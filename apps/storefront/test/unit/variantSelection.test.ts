import { describe, expect, it } from "vitest"
import {
  findVariant,
  isPurchasable,
  optionValueStock,
  stockLimit,
  variantFromQuery,
  variantPrice,
} from "../../app/utils/variantSelection"

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
    expect(
      isPurchasable(variant("v", {}, { manage_inventory: false, inventory_quantity: 0 }))
    ).toBe(true)
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

const colourShirt = {
  options: [
    { id: "opt_c", title: "Colour", values: [{ value: "Sand" }, { value: "Sage" }] },
    { id: "opt_s", title: "Size", values: [{ value: "M" }, { value: "L" }] },
  ],
  variants: [
    {
      id: "v1",
      inventory_quantity: 3,
      manage_inventory: true,
      options: [
        { option_id: "opt_c", value: "Sand" },
        { option_id: "opt_s", value: "M" },
      ],
    },
    {
      id: "v2",
      inventory_quantity: 0,
      manage_inventory: true,
      options: [
        { option_id: "opt_c", value: "Sand" },
        { option_id: "opt_s", value: "L" },
      ],
    },
    {
      id: "v3",
      inventory_quantity: 4,
      manage_inventory: true,
      options: [
        { option_id: "opt_c", value: "Sage" },
        { option_id: "opt_s", value: "L" },
      ],
    },
  ],
} as never

describe("optionValueStock", () => {
  it("strikes a size with no stock in the selected colour", () => {
    expect(optionValueStock(colourShirt, { opt_c: "Sand", opt_s: "M" }, "opt_s")).toEqual([
      { value: "M", soldOut: false },
      { value: "L", soldOut: true },
    ])
    expect(optionValueStock(colourShirt, { opt_c: "Sage" }, "opt_s")).toEqual([
      { value: "M", soldOut: true },
      { value: "L", soldOut: false },
    ])
  })

  it("ignores an option with no selected value", () => {
    expect(optionValueStock(colourShirt, {}, "opt_s")).toEqual([
      { value: "M", soldOut: false },
      { value: "L", soldOut: false },
    ])
  })

  it("does not use the selected value of the option itself as a condition", () => {
    expect(optionValueStock(colourShirt, { opt_c: "Sand", opt_s: "L" }, "opt_c")).toEqual([
      { value: "Sand", soldOut: true },
      { value: "Sage", soldOut: false },
    ])
  })

  it("gives an empty list for an unknown option", () => {
    expect(optionValueStock(colourShirt, {}, "opt_x")).toEqual([])
  })
})

describe("stockLimit", () => {
  it("gives the stock limit of a variant that tracks stock", () => {
    expect(stockLimit({ inventory_quantity: 3, manage_inventory: true } as never)).toBe(3)
    expect(stockLimit({ inventory_quantity: -2, manage_inventory: true } as never)).toBe(0)
    expect(stockLimit({ inventory_quantity: 3, allow_backorder: true } as never)).toBeNull()
    expect(stockLimit({ manage_inventory: false } as never)).toBeNull()
    expect(stockLimit(null)).toBeNull()
  })
})

describe("variantFromQuery", () => {
  const product = {
    id: "prod_1",
    variants: [variant("v1", { opt_size: "S" }), variant("v2", { opt_size: "M" })],
  } as never
  const single = { id: "prod_2", variants: [variant("s1", {})] } as never

  it("returns the variant with the id", () => {
    expect(variantFromQuery(product, "v2")?.id).toBe("v2")
  })

  // Review Focus: odd query values.
  it("ignores an unknown id, an array, and a missing value", () => {
    expect(variantFromQuery(product, "v_old")).toBeNull()
    expect(variantFromQuery(product, ["v2", "v1"])).toBeNull()
    expect(variantFromQuery(product, undefined)).toBeNull()
  })

  it("ignores the id on a product with one variant", () => {
    expect(variantFromQuery(single, "s1")).toBeNull()
  })
})
