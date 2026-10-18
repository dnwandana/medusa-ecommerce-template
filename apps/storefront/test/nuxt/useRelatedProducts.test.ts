import { flushPromises } from "@vue/test-utils"
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import {
  latestLineProductId,
  useRelatedProducts,
  type RelatedSource,
} from "~/composables/useRelatedProducts"

const { catalog, sdk } = vi.hoisted(() => ({
  catalog: { listProducts: vi.fn() },
  sdk: { store: { product: { list: vi.fn() } } },
}))

mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useMedusa", () => () => sdk)

const card = (id: string, stock = 5) =>
  ({
    id,
    variants: [{ id: `${id}_v`, manage_inventory: true, inventory_quantity: stock }],
  }) as never

let run = 0

async function runRelated(source: () => RelatedSource | null) {
  let result!: ReturnType<typeof useRelatedProducts>
  const key = `test-${++run}`
  const Host = defineComponent({
    setup() {
      result = useRelatedProducts(key, source)
      return () => h("div")
    },
  })
  await mountSuspended(Host)
  await flushPromises()
  return result
}

beforeEach(() => {
  catalog.listProducts.mockReset().mockResolvedValue({ products: [], count: 0 })
  sdk.store.product.list.mockReset().mockResolvedValue({ products: [] })
})

describe("useRelatedProducts", () => {
  it("shows the 4 newest products of the first category with no sold-out product", async () => {
    catalog.listProducts.mockResolvedValue({
      products: [
        card("prod_1"),
        card("prod_a"),
        card("prod_b", 0),
        card("prod_c"),
        card("prod_d"),
        card("prod_e"),
        card("prod_f"),
      ],
      count: 7,
    })
    const result = await runRelated(() => ({
      productId: "prod_1",
      categories: [{ id: "cat_shirts", name: "Shirts", handle: "shirts" }] as never,
      excludeIds: ["prod_c"],
    }))

    expect(catalog.listProducts).toHaveBeenCalledWith({ categoryId: "cat_shirts", limit: 12 })
    expect(result.products.value.map((product) => product.id)).toEqual([
      "prod_a",
      "prod_d",
      "prod_e",
      "prod_f",
    ])
    expect(result.category.value).toEqual({ id: "cat_shirts", name: "Shirts", handle: "shirts" })
  })

  it("reads the category of a product when the source has no categories", async () => {
    sdk.store.product.list.mockResolvedValue({
      products: [{ id: "prod_9", categories: [{ id: "cat_tops", name: "Tops", handle: "tops" }] }],
    })
    catalog.listProducts.mockResolvedValue({ products: [card("prod_a")], count: 1 })
    const result = await runRelated(() => ({ productId: "prod_9", excludeIds: [] }))

    expect(sdk.store.product.list).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prod_9", fields: "id,*categories", limit: 1 })
    )
    expect(result.category.value?.handle).toBe("tops")
    expect(result.products.value.map((product) => product.id)).toEqual(["prod_a"])
  })

  it("gives no products for a product with no category", async () => {
    const result = await runRelated(() => ({ productId: "prod_1", categories: [], excludeIds: [] }))
    expect(catalog.listProducts).not.toHaveBeenCalled()
    expect(result.products.value).toEqual([])
    expect(result.category.value).toBeNull()
  })

  it("sends no request with no source", async () => {
    const result = await runRelated(() => null)
    expect(catalog.listProducts).not.toHaveBeenCalled()
    expect(sdk.store.product.list).not.toHaveBeenCalled()
    expect(result.products.value).toEqual([])
    expect(result.category.value).toBeNull()
  })

  it("gives no products when the request fails", async () => {
    catalog.listProducts.mockRejectedValue(new Error("offline"))
    const result = await runRelated(() => ({
      productId: "prod_1",
      categories: [{ id: "cat_shirts", name: "Shirts", handle: "shirts" }] as never,
      excludeIds: [],
    }))
    expect(result.products.value).toEqual([])
  })
})

describe("latestLineProductId", () => {
  it("finds the product of the line that the shopper added last", () => {
    expect(
      latestLineProductId([
        { product_id: "prod_old", created_at: "2026-10-01T00:00:00Z" },
        { product_id: "prod_new", created_at: "2026-10-03T00:00:00Z" },
        { product_id: "prod_mid", created_at: "2026-10-02T00:00:00Z" },
      ])
    ).toBe("prod_new")
    expect(latestLineProductId([])).toBeNull()
    expect(latestLineProductId(null)).toBeNull()
  })

  it("keeps the last line for a tie or for no date", () => {
    expect(
      latestLineProductId([
        { product_id: "prod_a", created_at: "2026-10-01T00:00:00Z" },
        { product_id: "prod_b", created_at: "2026-10-01T00:00:00Z" },
      ])
    ).toBe("prod_b")
    expect(latestLineProductId([{ product_id: "prod_a" }, { product_id: "prod_b" }])).toBe("prod_b")
  })
})
