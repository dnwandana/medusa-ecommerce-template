import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, useCatalog, useRegion } from "#imports"

const { sdk } = vi.hoisted(() => ({
  sdk: {
    store: {
      region: { list: vi.fn() },
      product: { list: vi.fn() },
      category: { list: vi.fn() },
    },
  },
}))

mockNuxtImport("useMedusa", () => () => sdk)

const FIELDS = "*variants.calculated_price,+variants.inventory_quantity"

beforeEach(() => {
  clearNuxtState()
  sdk.store.region.list.mockReset().mockResolvedValue({ regions: [{ id: "reg_1" }] })
  sdk.store.product.list.mockReset().mockResolvedValue({ products: [], count: 0 })
  sdk.store.category.list.mockReset().mockResolvedValue({ product_categories: [] })
})

describe("useRegion", () => {
  it("loads the region one time", async () => {
    const { ensureRegion, region } = useRegion()

    expect((await ensureRegion()).id).toBe("reg_1")
    expect((await ensureRegion()).id).toBe("reg_1")

    expect(region.value?.id).toBe("reg_1")
    expect(sdk.store.region.list).toHaveBeenCalledTimes(1)
  })

  it("fails with a clear message when the store has no region", async () => {
    sdk.store.region.list.mockResolvedValue({ regions: [] })

    await expect(useRegion().ensureRegion()).rejects.toThrow(
      "The store has no region. Run the seed: pnpm --filter @store/backend seed."
    )
  })
})

describe("useCatalog", () => {
  it("lists products with the region and the price fields", async () => {
    sdk.store.product.list.mockResolvedValue({ products: [{ id: "prod_1" }], count: 30 })

    const result = await useCatalog().listProducts()

    expect(sdk.store.product.list).toHaveBeenCalledWith({
      region_id: "reg_1",
      fields: FIELDS,
      limit: 12,
      offset: 0,
    })
    expect(result).toEqual({ products: [{ id: "prod_1" }], count: 30 })
  })

  it("passes the page and the category to the product list", async () => {
    await useCatalog().listProducts({ limit: 8, offset: 16, categoryId: "pcat_1" })

    expect(sdk.store.product.list).toHaveBeenCalledWith({
      region_id: "reg_1",
      fields: FIELDS,
      limit: 8,
      offset: 16,
      category_id: ["pcat_1"],
    })
  })

  it("returns the product with the given handle", async () => {
    sdk.store.product.list.mockResolvedValue({ products: [{ id: "prod_1" }], count: 1 })

    const product = await useCatalog().getProductByHandle("plain-t-shirt")

    expect(sdk.store.product.list).toHaveBeenCalledWith({
      region_id: "reg_1",
      fields: FIELDS,
      handle: "plain-t-shirt",
      limit: 1,
    })
    expect(product).toEqual({ id: "prod_1" })
  })

  it("returns null for a handle that has no product", async () => {
    expect(await useCatalog().getProductByHandle("unknown")).toBeNull()
  })

  it("lists the categories", async () => {
    sdk.store.category.list.mockResolvedValue({ product_categories: [{ id: "pcat_1" }] })

    expect(await useCatalog().listCategories()).toEqual([{ id: "pcat_1" }])
  })

  it("returns the category with the given handle, or null", async () => {
    sdk.store.category.list.mockResolvedValueOnce({ product_categories: [{ id: "pcat_1" }] })

    expect(await useCatalog().getCategoryByHandle("apparel")).toEqual({ id: "pcat_1" })
    expect(sdk.store.category.list).toHaveBeenCalledWith({ handle: "apparel", limit: 1 })
    expect(await useCatalog().getCategoryByHandle("unknown")).toBeNull()
  })
})
