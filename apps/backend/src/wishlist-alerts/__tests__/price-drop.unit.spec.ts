import { batchOffset, PRICE_DROP_BATCH, PriceItem, selectPriceDrops } from "../price-drop"

const item = (id: string, saved: number | null) => ({
  id,
  wishlist_id: "wl_1",
  product_variant_id: `var_${id}`,
  saved_unit_price: saved,
})

describe("selectPriceDrops", () => {
  it("finds the drops and updates the saved price", () => {
    const prices = new Map([
      ["var_a", 256000],
      ["var_b", 320000],
      ["var_c", 400000],
    ])
    expect(
      selectPriceDrops([item("a", 320000), item("b", 320000), item("c", 320000)], prices)
    ).toEqual({
      drops: [{ item: item("a", 320000), old_price: 320000, new_price: 256000 }],
      updates: [{ id: "a", saved_unit_price: 256000 }],
    })
  })

  it("fills a null saved price without a drop", () => {
    expect(selectPriceDrops([item("a", null)], new Map([["var_a", 100]]))).toEqual({
      drops: [],
      updates: [{ id: "a", saved_unit_price: 100 }],
    })
  })

  it("ignores a missing or null current price", () => {
    expect(selectPriceDrops([item("a", 100), item("b", 100)], new Map([["var_a", null]]))).toEqual({
      drops: [],
      updates: [],
    })
  })

  it("does not alert a drop that stays above the saved price", () => {
    // Saved 100, the price rose to 150 (no update), then dropped to 120. 120 is above 100.
    expect(selectPriceDrops([item("a", 100)], new Map([["var_a", 120]]))).toEqual({
      drops: [],
      updates: [],
    })
  })

  it("keeps the extra fields of a dropped item", () => {
    const rich: PriceItem & { title: string } = { ...item("a", 200), title: "Shirt" }
    expect(selectPriceDrops([rich], new Map([["var_a", 100]])).drops[0].item.title).toBe("Shirt")
  })

  it("reads at most 500 items in one run", () => {
    expect(PRICE_DROP_BATCH).toBe(500)
  })
})

describe("batchOffset", () => {
  const day = (n: number) => new Date(n * 24 * 60 * 60 * 1000 + 21 * 60 * 60 * 1000)

  it("starts at 0 when one batch holds all the items", () => {
    expect(batchOffset(500, day(7))).toBe(0)
    expect(batchOffset(0, day(7))).toBe(0)
  })

  it("moves one batch forward each day and wraps at the end", () => {
    expect([0, 1, 2, 3].map((n) => batchOffset(1200, day(n)))).toEqual([0, 500, 1000, 300])
  })

  it("reaches every item over the days", () => {
    const seen = new Set<number>()
    for (let n = 0; n < 10; n++) {
      const offset = batchOffset(700, day(n))
      for (let i = offset; i < Math.min(offset + PRICE_DROP_BATCH, 700); i++) seen.add(i)
    }
    expect(seen.size).toBe(700)
  })
})
