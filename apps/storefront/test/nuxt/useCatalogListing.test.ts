import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState } from "#imports"
import { PRODUCT_FIELDS } from "~/composables/useCatalog"
import { EMPTY_FILTER_VALUES, useCatalogListing } from "~/composables/useCatalogListing"
import { EMPTY_CATALOG_STATE } from "~/utils/catalogQuery"

const { sdk } = vi.hoisted(() => ({
  sdk: {
    store: {
      region: { list: vi.fn() },
      product: { list: vi.fn() },
    },
    client: { fetch: vi.fn() },
  },
}))

mockNuxtImport("useMedusa", () => () => sdk)

const VALUES = {
  sizes: [{ key: "m", label: "M", ids: ["ov_m1", "ov_m2"] }],
  colours: [{ key: "sage", label: "Sage", ids: ["ov_sage"] }],
  fabrics: [{ key: "linen", label: "Linen", ids: ["tag_linen"] }],
}
const LIMITS = [500000, 1000000]

beforeEach(() => {
  clearNuxtState()
  sdk.store.region.list.mockReset().mockResolvedValue({ regions: [{ id: "reg_1" }] })
  sdk.store.product.list.mockReset().mockResolvedValue({ products: [], count: 0 })
  sdk.client.fetch.mockReset()
})

describe("useCatalogListing", () => {
  it("lists the filter values of the scope", async () => {
    sdk.client.fetch.mockResolvedValue(VALUES)
    expect(await useCatalogListing().listFilters({ categoryId: "pcat_1" })).toEqual(VALUES)
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/storefront/catalog/filters", {
      query: { category_id: ["pcat_1"] },
    })
  })

  it("lists the filter values of a category with its descendants", async () => {
    sdk.client.fetch.mockResolvedValue(VALUES)
    await useCatalogListing().listFilters({ categoryId: "pcat_c", descendantIds: ["pcat_a"] })
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/storefront/catalog/filters", {
      query: { category_id: ["pcat_c", "pcat_a"] },
    })
  })

  it("lists the products of a category with its descendants on both routes", async () => {
    const scope = { categoryId: "pcat_c", descendantIds: ["pcat_a", "pcat_b"] }
    await useCatalogListing().listPage(scope, EMPTY_CATALOG_STATE, VALUES, LIMITS, 1)
    expect(sdk.store.product.list.mock.lastCall![0].category_id).toEqual([
      "pcat_c",
      "pcat_a",
      "pcat_b",
    ])

    sdk.client.fetch.mockResolvedValue({ products: [], count: 0, limit: 12, offset: 0 })
    const state = { ...EMPTY_CATALOG_STATE, sort: "price-asc" as const }
    await useCatalogListing().listPage(scope, state, VALUES, LIMITS, 1)
    expect(sdk.client.fetch.mock.lastCall![1].query.category_id).toEqual([
      "pcat_c",
      "pcat_a",
      "pcat_b",
    ])
  })

  it("gives no filter values when the filter route fails", async () => {
    sdk.client.fetch.mockRejectedValue(new Error("down"))
    expect(await useCatalogListing().listFilters({})).toEqual(EMPTY_FILTER_VALUES)
  })

  it("uses the Store API product list with no price filter and no price sort", async () => {
    sdk.store.product.list.mockResolvedValue({ products: [{ id: "prod_1" }], count: 13 })
    const state = { ...EMPTY_CATALOG_STATE, size: ["m"], fabric: ["linen", "silk"] }
    const page = await useCatalogListing().listPage(
      { categoryId: "pcat_1" },
      state,
      VALUES,
      LIMITS,
      2
    )

    expect(sdk.client.fetch).not.toHaveBeenCalled()
    expect(sdk.store.product.list).toHaveBeenCalledWith({
      region_id: "reg_1",
      fields: PRODUCT_FIELDS,
      order: "-created_at",
      limit: 12,
      offset: 12,
      category_id: ["pcat_1"],
      $and: [{ option_value_id: ["ov_m1", "ov_m2"] }, { tag_id: ["tag_linen"] }],
    })
    expect(page).toEqual({ products: [{ id: "prod_1" }], count: 13 })
  })

  it("sends no $and with no filter", async () => {
    await useCatalogListing().listPage({ q: " " }, EMPTY_CATALOG_STATE, VALUES, LIMITS, 1)

    const query = sdk.store.product.list.mock.lastCall![0]
    expect(query).not.toHaveProperty("$and")
    expect(query).not.toHaveProperty("q")
  })

  it("uses the price route for a price range", async () => {
    sdk.client.fetch.mockResolvedValue({ products: [], count: 0, limit: 12, offset: 0 })
    const state = { ...EMPTY_CATALOG_STATE, colour: ["sage"], price: "500000-1000000" }
    const page = await useCatalogListing().listPage({ q: "shirt" }, state, VALUES, LIMITS, 1)

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/storefront/catalog/products", {
      query: {
        region_id: "reg_1",
        q: "shirt",
        colour: ["ov_sage"],
        price_from: 500000,
        price_to: 1000000,
        sort: "newest",
        limit: 12,
        offset: 0,
      },
    })
    expect(page).toEqual({ products: [], count: 0 })
  })

  it("uses the price route for a price sort, and ignores an unknown price key", async () => {
    sdk.client.fetch.mockResolvedValue({ products: [], count: 0, limit: 12, offset: 0 })
    const state = { ...EMPTY_CATALOG_STATE, price: "0-200000", sort: "price-desc" as const }
    await useCatalogListing().listPage({}, state, VALUES, LIMITS, 1)

    expect(sdk.client.fetch.mock.lastCall![1].query).not.toHaveProperty("price_to")
    expect(sdk.client.fetch.mock.lastCall![1].query.sort).toBe("price-desc")
  })

  it("sends a request error to the caller", async () => {
    sdk.store.product.list.mockRejectedValue(new Error("down"))
    await expect(
      useCatalogListing().listPage({}, EMPTY_CATALOG_STATE, VALUES, LIMITS, 1)
    ).rejects.toThrow("down")
  })
})
