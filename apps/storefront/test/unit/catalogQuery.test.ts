import { describe, expect, it } from "vitest"
import {
  EMPTY_CATALOG_STATE,
  activeFilterCount,
  clearFilters,
  needsPriceRoute,
  parseCatalogQuery,
  toCatalogQuery,
  toggleFilterValue,
} from "../../app/utils/catalogQuery"

describe("catalog query", () => {
  it("reads the spec example", () => {
    expect(parseCatalogQuery({ colour: "sage", size: "m", sort: "price-asc" })).toEqual({
      ...EMPTY_CATALOG_STATE,
      colour: ["sage"],
      size: ["m"],
      sort: "price-asc",
    })
  })

  it("accepts comma lists and repeated keys, with no duplicate", () => {
    expect(parseCatalogQuery({ size: ["S,M", "m "] }).size).toEqual(["s", "m"])
  })

  it("ignores a bad sort and a bad page", () => {
    expect(parseCatalogQuery({ sort: "popular", page: "-2" })).toEqual(EMPTY_CATALOG_STATE)
    expect(parseCatalogQuery({ page: "2.5" }).page).toBe(1)
    expect(parseCatalogQuery({ page: "3" }).page).toBe(3)
  })

  it("ignores a price that is not a range key", () => {
    expect(parseCatalogQuery({ price: "1000000-" }).price).toBe("1000000-")
    expect(parseCatalogQuery({ price: "cheap" }).price).toBeNull()
  })

  it("writes the spec example and leaves out the defaults", () => {
    const state = {
      ...EMPTY_CATALOG_STATE,
      colour: ["sage"],
      size: ["m"],
      sort: "price-asc" as const,
    }
    expect(new URLSearchParams(toCatalogQuery(state)).toString()).toBe(
      "size=m&colour=sage&sort=price-asc"
    )
    expect(toCatalogQuery(EMPTY_CATALOG_STATE)).toEqual({})
  })

  it("reads back each state that it writes", () => {
    const state = {
      size: ["s", "m"],
      colour: ["sage"],
      fabric: ["linen"],
      price: "0-500000",
      sort: "price-desc" as const,
      page: 3,
    }
    expect(parseCatalogQuery(toCatalogQuery(state))).toEqual(state)
  })

  it("goes back to page 1 when a filter changes", () => {
    const state = { ...EMPTY_CATALOG_STATE, page: 4 }
    const next = toggleFilterValue(state, "size", "m")
    expect(next).toMatchObject({ size: ["m"], page: 1 })
    expect(state.size).toEqual([])
    expect(toggleFilterValue(next, "size", "m").size).toEqual([])
  })

  it("clears the filters and keeps the sort", () => {
    const state = {
      ...EMPTY_CATALOG_STATE,
      size: ["m"],
      price: "0-500000",
      sort: "price-desc" as const,
    }
    expect(activeFilterCount(state)).toBe(2)
    expect(clearFilters(state)).toEqual({ ...EMPTY_CATALOG_STATE, sort: "price-desc" })
  })

  it("uses the price route only for a price range or a price sort", () => {
    expect(needsPriceRoute({ ...EMPTY_CATALOG_STATE, size: ["m"] })).toBe(false)
    expect(needsPriceRoute({ ...EMPTY_CATALOG_STATE, price: "1000000-" })).toBe(true)
    expect(needsPriceRoute({ ...EMPTY_CATALOG_STATE, sort: "price-asc" })).toBe(true)
  })
})
