import { ALERT_COOLDOWN_MS, StockItem, transitionStockItems } from "../back-in-stock"

const NOW = new Date("2026-10-21T00:00:00Z")
const item = (id: string, available: boolean, alerted_at: Date | string | null = null) => ({
  id,
  wishlist_id: "wl_1",
  available,
  alerted_at,
})

describe("transitionStockItems", () => {
  it("alerts an item that was out of stock", () => {
    expect(transitionStockItems([item("a", false)], true, NOW)).toEqual({
      alerts: [item("a", false)],
      updates: [{ id: "a", available: true }],
    })
  })

  it("skips an item alerted less than 24 hours ago", () => {
    expect(transitionStockItems([item("a", false, "2026-10-20T06:00:00Z")], true, NOW)).toEqual({
      alerts: [],
      updates: [],
    })
  })

  it("alerts an item alerted more than 24 hours ago", () => {
    expect(
      transitionStockItems([item("a", false, "2026-10-19T00:00:00Z")], true, NOW).alerts
    ).toHaveLength(1)
  })

  it("alerts an item alerted exactly 24 hours ago", () => {
    const alerted = new Date(NOW.getTime() - ALERT_COOLDOWN_MS)
    expect(transitionStockItems([item("a", false, alerted)], true, NOW).alerts).toHaveLength(1)
  })

  it("accepts a Date as the alert time", () => {
    const alerted = new Date("2026-10-20T06:00:00Z")
    expect(transitionStockItems([item("a", false, alerted)], true, NOW)).toEqual({
      alerts: [],
      updates: [],
    })
  })

  it("marks an available item as out of stock", () => {
    expect(transitionStockItems([item("a", true)], false, NOW)).toEqual({
      alerts: [],
      updates: [{ id: "a", available: false }],
    })
  })

  it("does nothing when the state is unchanged", () => {
    expect(transitionStockItems([item("a", true), item("b", false)], true, NOW).updates).toEqual([
      { id: "b", available: true },
    ])
    expect(transitionStockItems([item("a", false)], false, NOW)).toEqual({
      alerts: [],
      updates: [],
    })
  })

  it("keeps the extra fields of an alerted item", () => {
    const rich: StockItem & { product_variant_id: string } = {
      ...item("a", false),
      product_variant_id: "var_a",
    }
    expect(transitionStockItems([rich], true, NOW).alerts[0].product_variant_id).toBe("var_a")
  })
})
