import { calculateShippingAmount } from "../calculate"

const RATE = 10000
const item = (weight: number | null | undefined, quantity: number | string = 1) => ({
  quantity,
  variant: { weight },
})

describe("calculateShippingAmount", () => {
  it("charges IDR 10,000 for a 300 g order", () => {
    expect(calculateShippingAmount([item(300)], RATE)).toBe(10000)
  })

  it("charges IDR 20,000 for a 1.2 kg order", () => {
    expect(calculateShippingAmount([item(1200)], RATE)).toBe(20000)
  })

  it("does not round up an exact kilogram", () => {
    expect(calculateShippingAmount([item(1000)], RATE)).toBe(10000)
    expect(calculateShippingAmount([item(1001)], RATE)).toBe(20000)
  })

  it("counts a variant with no weight as 1 kg for each unit", () => {
    expect(calculateShippingAmount([item(null, 2)], RATE)).toBe(20000)
    expect(calculateShippingAmount([item(undefined, 3)], RATE)).toBe(30000)
    expect(calculateShippingAmount([{ quantity: 1, variant: null }], RATE)).toBe(10000)
    expect(calculateShippingAmount([{ quantity: 1 }], RATE)).toBe(10000)
  })

  it("sums several items and quantities before it rounds", () => {
    // 300 g x 3 = 900 g, no weight x 1 = 1000 g, 500 g x 2 = 1000 g. Total 2900 g = 3 kg.
    const items = [item(300, 3), item(null, 1), item(500, 2)]
    expect(calculateShippingAmount(items, RATE)).toBe(30000)
  })

  it("uses the 1 kg minimum for an empty cart", () => {
    expect(calculateShippingAmount([], RATE)).toBe(10000)
  })

  it("uses the given rate", () => {
    expect(calculateShippingAmount([item(300)], 12000)).toBe(12000)
  })

  // Review Focus: invalid weights and string quantities.
  it("counts a weight of 0 or a negative weight as 1 kg for each unit", () => {
    expect(calculateShippingAmount([item(0, 2)], RATE)).toBe(20000)
    expect(calculateShippingAmount([item(-50, 1)], RATE)).toBe(10000)
  })

  it("accepts a quantity that arrives as a string", () => {
    expect(calculateShippingAmount([item(600, "3")], RATE)).toBe(20000)
  })

  it("ignores an item with a quantity that is not a positive number", () => {
    expect(calculateShippingAmount([item(5000, 0), item(300, 1)], RATE)).toBe(10000)
    expect(calculateShippingAmount([item(5000, "abc")], RATE)).toBe(10000)
  })
})
