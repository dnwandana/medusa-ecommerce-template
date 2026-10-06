import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import { CatalogPagination, CategoryFilter, ProductGrid } from "#components"
import ProductsPage from "~/pages/products/index.vue"

const { catalog } = vi.hoisted(() => ({
  catalog: { listProducts: vi.fn(), listCategories: vi.fn() },
}))

mockNuxtImport("useCatalog", () => () => catalog)

beforeEach(() => {
  clearNuxtData()
  catalog.listProducts.mockReset().mockResolvedValue({
    products: [
      {
        id: "prod_1",
        title: "Plain T-Shirt",
        handle: "plain-t-shirt",
        thumbnail: null,
        variants: [],
      },
    ],
    count: 30,
  })
  catalog.listCategories
    .mockReset()
    .mockResolvedValue([{ id: "pcat_1", name: "Shirts", handle: "shirts" }])
})

describe("products page", () => {
  it("loads page 2 with an offset of 12", async () => {
    await mountSuspended(ProductsPage, { route: "/products?page=2" })

    expect(catalog.listProducts).toHaveBeenCalledWith({ offset: 12 })
  })

  it("loads page 1 for a page value that is not a number", async () => {
    await mountSuspended(ProductsPage, { route: "/products?page=abc" })

    expect(catalog.listProducts).toHaveBeenCalledWith({ offset: 0 })
  })

  it("shows the category filter, the product grid, and the pagination", async () => {
    const wrapper = await mountSuspended(ProductsPage, { route: "/products?page=2" })

    expect(wrapper.find("h1").text()).toBe("All products")
    expect(wrapper.findComponent(CategoryFilter).props("categories")).toHaveLength(1)
    expect(wrapper.findComponent(CategoryFilter).props("currentHandle")).toBeUndefined()
    expect(wrapper.findComponent(ProductGrid).props("loading")).toBe(false)
    expect(wrapper.findComponent(CatalogPagination).props()).toMatchObject({
      page: 2,
      count: 30,
      path: "/products",
    })
  })

  it("shows a destructive alert when the products do not load", async () => {
    catalog.listProducts.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(ProductsPage, { route: "/products" })

    expect(wrapper.find('[role="alert"]').text()).toBe("An error occurred. Try again.")
  })
})
