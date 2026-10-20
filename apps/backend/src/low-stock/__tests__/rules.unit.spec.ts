import { INVENTORY_LOW_STOCK_ALERTED_AT as FROM_METADATA } from "../../lib/storefront-metadata"
import { INVENTORY_LOW_STOCK_ALERTED_AT, lowStockTransition } from "../rules"

const base = { threshold: 5, manage_inventory: true, alerted_at: null }

describe("lowStockTransition", () => {
  it("alerts at the crossing and not below it", () => {
    expect(lowStockTransition({ ...base, available: 5 })).toBe("alert")
    expect(lowStockTransition({ ...base, available: 3, alerted_at: "2026-10-20T00:00:00Z" })).toBe(
      "none"
    )
  })

  it("resets above the threshold", () => {
    expect(lowStockTransition({ ...base, available: 6, alerted_at: "x" })).toBe("reset")
    expect(lowStockTransition({ ...base, available: 6 })).toBe("none")
  })

  it("is off at threshold 0 and for untracked stock", () => {
    expect(lowStockTransition({ ...base, threshold: 0, available: 0 })).toBe("none")
    expect(lowStockTransition({ ...base, threshold: 0, available: 0, alerted_at: "x" })).toBe(
      "none"
    )
    expect(lowStockTransition({ ...base, manage_inventory: false, available: 0 })).toBe("none")
  })
})

describe("INVENTORY_LOW_STOCK_ALERTED_AT", () => {
  it("is one key in the two modules", () => {
    expect(INVENTORY_LOW_STOCK_ALERTED_AT).toBe("low_stock_alerted_at")
    expect(FROM_METADATA).toBe(INVENTORY_LOW_STOCK_ALERTED_AT)
  })
})
