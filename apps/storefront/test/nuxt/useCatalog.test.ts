import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, PRODUCT_FIELDS, useCatalog, useRegion } from "#imports"
import { PRODUCT_PAGE_FIELDS } from "~/composables/useCatalog"

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

const FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,*variants.options,*options.values,*tags,*images,+metadata,+created_at"

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
      order: "-created_at",
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
      order: "-created_at",
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
      fields: PRODUCT_PAGE_FIELDS,
      handle: "plain-t-shirt",
      limit: 1,
    })
    expect(product).toEqual({ id: "prod_1" })
    expect(sdk.store.category.list).not.toHaveBeenCalled()
  })

  it("reads the image links and the categories of the product page", async () => {
    await useCatalog().getProductByHandle("linen-shirt")
    expect(sdk.store.product.list).toHaveBeenCalledWith(
      expect.objectContaining({ handle: "linen-shirt", limit: 1, fields: PRODUCT_PAGE_FIELDS })
    )
    expect(PRODUCT_PAGE_FIELDS.startsWith(`${PRODUCT_FIELDS},`)).toBe(true)
    // The Store product route allows variants.images and categories, but not
    // images.variants or categories.parent_category.
    expect(PRODUCT_PAGE_FIELDS).toContain("*variants.images")
    expect(PRODUCT_PAGE_FIELDS).toContain("*categories")
    expect(PRODUCT_PAGE_FIELDS).not.toContain("images.variants")
  })

  it("reads the parent of each product category from the category route", async () => {
    sdk.store.product.list.mockResolvedValue({
      products: [
        {
          id: "prod_1",
          categories: [
            { id: "pcat_shirts", name: "Shirts" },
            { id: "pcat_sale", name: "Sale" },
          ],
        },
      ],
      count: 1,
    })
    sdk.store.category.list.mockResolvedValue({
      product_categories: [
        { id: "pcat_sale", name: "Sale", parent_category: null },
        { id: "pcat_shirts", name: "Shirts", parent_category: { id: "pcat_tops" } },
      ],
    })

    const product = await useCatalog().getProductByHandle("linen-shirt")

    expect(sdk.store.category.list).toHaveBeenCalledWith({
      id: ["pcat_shirts", "pcat_sale"],
      limit: 2,
    })
    expect(product?.categories?.map((category) => category.id)).toEqual([
      "pcat_shirts",
      "pcat_sale",
    ])
    expect(product?.categories?.[0]?.parent_category).toEqual({ id: "pcat_tops" })
  })

  it("keeps the product categories when the category route fails", async () => {
    sdk.store.product.list.mockResolvedValue({
      products: [{ id: "prod_1", categories: [{ id: "pcat_shirts", name: "Shirts" }] }],
      count: 1,
    })
    sdk.store.category.list.mockRejectedValue(new Error("down"))

    const product = await useCatalog().getProductByHandle("linen-shirt")

    expect(product?.categories).toEqual([{ id: "pcat_shirts", name: "Shirts" }])
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
    expect(sdk.store.category.list).toHaveBeenCalledWith({
      handle: "apparel",
      limit: 1,
      fields: "*parent_category,*category_children",
    })
    expect(await useCatalog().getCategoryByHandle("unknown")).toBeNull()
  })

  it("sends the search text and leaves out an empty one", async () => {
    await useCatalog().listProducts({ q: " linen " })
    expect(sdk.store.product.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "linen", order: "-created_at" })
    )

    await useCatalog().listProducts({ q: "  " })
    expect(sdk.store.product.list.mock.lastCall![0]).not.toHaveProperty("q")
  })

  it("reads the parent, and the children with their own children", async () => {
    const tree = [{ id: "pcat_2", category_children: [{ id: "pcat_3", category_children: [] }] }]
    sdk.store.category.list.mockImplementation(async (query) => ({
      product_categories: [
        query.include_descendants_tree
          ? { id: "pcat_1", category_children: tree }
          : {
              id: "pcat_1",
              parent_category: { id: "pcat_0" },
              category_children: [{ id: "pcat_2" }],
            },
      ],
    }))

    expect(await useCatalog().getCategoryByHandle("shirts")).toEqual({
      id: "pcat_1",
      parent_category: { id: "pcat_0" },
      category_children: tree,
    })
    // The descendants tree drops the parent, so a second request reads the tree.
    expect(sdk.store.category.list).toHaveBeenCalledWith({
      handle: "shirts",
      limit: 1,
      fields: "*parent_category,*category_children",
    })
    expect(sdk.store.category.list).toHaveBeenCalledWith({
      handle: "shirts",
      limit: 1,
      fields: "id,*category_children",
      include_descendants_tree: true,
    })
  })

  it("keeps the exported product fields", () => {
    expect(PRODUCT_FIELDS).toBe(FIELDS)
  })
})

describe("listVariantStock", () => {
  it("reads the stock of each variant in one request", async () => {
    sdk.store.product.list.mockResolvedValue({
      products: [
        {
          id: "prod_1",
          variants: [
            { id: "v_s", inventory_quantity: 3, manage_inventory: true, allow_backorder: false },
            { id: "v_m", inventory_quantity: 0, manage_inventory: true, allow_backorder: false },
          ],
        },
        {
          id: "prod_2",
          variants: [
            { id: "v_one", inventory_quantity: 0, manage_inventory: false, allow_backorder: false },
          ],
        },
      ],
      count: 2,
    })

    const stock = await useCatalog().listVariantStock(["prod_1", "prod_2", "prod_1"])

    expect(sdk.store.product.list).toHaveBeenCalledTimes(1)
    expect(sdk.store.product.list).toHaveBeenCalledWith({
      id: ["prod_1", "prod_2"],
      fields:
        "id,variants.id,variants.manage_inventory,variants.allow_backorder,+variants.inventory_quantity",
      limit: 2,
    })
    expect(stock.v_s).toEqual({
      id: "v_s",
      inventory_quantity: 3,
      manage_inventory: true,
      allow_backorder: false,
    })
    expect(Object.keys(stock)).toEqual(["v_s", "v_m", "v_one"])
    expect(sdk.store.region.list).not.toHaveBeenCalled()
  })

  it("sends no request with no product", async () => {
    expect(await useCatalog().listVariantStock([])).toEqual({})
    expect(sdk.store.product.list).not.toHaveBeenCalled()
  })
})
