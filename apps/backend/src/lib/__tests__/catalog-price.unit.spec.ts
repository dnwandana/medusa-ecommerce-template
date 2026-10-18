import { lowestPrice, matchesFilters, orderProductIds } from "../catalog-price"

const product = (id: string, created: string, prices: (number | null)[], ids: string[] = []) => ({
  id,
  created_at: created,
  options: [{ values: ids.map((v) => ({ id: v })) }],
  tags: [],
  variants: prices.map((p) => ({ calculated_price: p === null ? null : { calculated_amount: p } })),
})

const shirt = product("shirt", "2026-09-01", [389000, 349000], ["ov_s", "ov_sage"])
const coat = product("coat", "2026-10-01", [1250000], ["ov_m"])
const scarf = product("scarf", "2026-10-10", [null])

describe("catalog price", () => {
  it("takes the lowest variant price", () => {
    expect(lowestPrice(shirt)).toBe(349000)
    expect(lowestPrice(scarf)).toBeNull()
    expect(lowestPrice({ ...scarf, variants: null })).toBeNull()
  })

  it("combines ids with OR in one filter and AND across filters", () => {
    expect(matchesFilters(shirt, { size: ["ov_s", "ov_m"], colour: [], fabric: [] })).toBe(true)
    expect(matchesFilters(shirt, { size: ["ov_s"], colour: ["ov_ink"], fabric: [] })).toBe(false)
    expect(matchesFilters(shirt, { size: [], colour: [], fabric: [] })).toBe(true)
  })

  it("matches a fabric by the tag id", () => {
    const linen = { ...shirt, tags: [{ id: "tag_linen" }] }
    expect(matchesFilters(linen, { size: [], colour: [], fabric: ["tag_linen"] })).toBe(true)
    expect(matchesFilters(shirt, { size: [], colour: [], fabric: ["tag_linen"] })).toBe(false)
  })

  it("sorts by price and by newest", () => {
    expect(orderProductIds([shirt, coat, scarf], { sort: "newest" })).toEqual([
      "scarf",
      "coat",
      "shirt",
    ])
    expect(orderProductIds([coat, shirt], { sort: "price-asc" })).toEqual(["shirt", "coat"])
    expect(orderProductIds([shirt, coat], { sort: "price-desc" })).toEqual(["coat", "shirt"])
  })

  it("orders equal prices newest first", () => {
    const older = product("older", "2026-01-01", [100000])
    const newer = product("newer", "2026-02-01", [100000])
    expect(orderProductIds([older, newer], { sort: "price-asc" })).toEqual(["newer", "older"])
    expect(orderProductIds([older, newer], { sort: "price-desc" })).toEqual(["newer", "older"])
  })

  it("includes the From amount and excludes the To amount", () => {
    expect(orderProductIds([shirt, coat], { from: 349000, to: 1250000, sort: "newest" })).toEqual([
      "shirt",
    ])
  })

  // Review Focus: a product with no calculated price in the region.
  it("leaves a product with no price out of a price filter and puts it last in a price sort", () => {
    expect(orderProductIds([scarf, shirt], { to: 500000, sort: "newest" })).toEqual(["shirt"])
    expect(orderProductIds([scarf, coat, shirt], { sort: "price-asc" })).toEqual([
      "shirt",
      "coat",
      "scarf",
    ])
    expect(orderProductIds([scarf, coat, shirt], { sort: "price-desc" })).toEqual([
      "coat",
      "shirt",
      "scarf",
    ])
  })
})
