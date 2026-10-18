import { describe, expect, it } from "vitest"
import { cartSavings } from "~/utils/cartSavings"

describe("cartSavings", () => {
  it("adds the savings of each line with a higher compare-at price", () => {
    expect(
      cartSavings([
        { unit_price: 150000, compare_at_unit_price: 200000, quantity: 2 },
        { unit_price: 100000, compare_at_unit_price: null, quantity: 1 },
        { unit_price: 90000, compare_at_unit_price: 80000, quantity: 1 },
      ] as never)
    ).toBe(100000)
    expect(cartSavings([])).toBe(0)
    expect(cartSavings(undefined)).toBe(0)
  })
})
