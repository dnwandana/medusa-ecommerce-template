import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import { CatalogPagination, CategoryFilter } from "#components"
import CategoryPage from "~/pages/categories/[handle].vue"

const { catalog } = vi.hoisted(() => ({
  catalog: { getCategoryByHandle: vi.fn(), listProducts: vi.fn(), listCategories: vi.fn() },
}))

mockNuxtImport("useCatalog", () => () => catalog)

const shirts = { id: "pcat_1", name: "Shirts", handle: "shirts", description: "Relaxed shirts for most days." }

beforeEach(() => {
  clearNuxtData()
  catalog.getCategoryByHandle.mockReset().mockResolvedValue(shirts)
  catalog.listProducts.mockReset().mockResolvedValue({ products: [], count: 30 })
  catalog.listCategories.mockReset().mockResolvedValue([shirts, { id: "pcat_2", name: "Trousers", handle: "trousers" }])
})

describe("category page", () => {
  it("loads page 2 of the category with an offset of 12", async () => {
    await mountSuspended(CategoryPage, { route: "/categories/shirts?page=2" })

    expect(catalog.listProducts).toHaveBeenCalledWith({ categoryId: "pcat_1", offset: 12 })
  })

  it("shows the breadcrumb, the name, and the description", async () => {
    const wrapper = await mountSuspended(CategoryPage, { route: "/categories/shirts" })
    const breadcrumb = wrapper.find('nav[aria-label="Breadcrumb"]')

    expect(breadcrumb.find('a[href="/"]').text()).toBe("Home")
    expect(breadcrumb.find('a[href="/products"]').text()).toBe("Products")
    expect(breadcrumb.find('[aria-current="page"]').text()).toBe("Shirts")
    expect(wrapper.find("h1").text()).toBe("Shirts")
    expect(wrapper.text()).toContain("Relaxed shirts for most days.")
  })

  it("marks the category in the filter and links the pagination to the category", async () => {
    const wrapper = await mountSuspended(CategoryPage, { route: "/categories/shirts?page=2" })

    expect(wrapper.findComponent(CategoryFilter).props("currentHandle")).toBe("shirts")
    expect(wrapper.findComponent(CatalogPagination).props()).toMatchObject({ page: 2, count: 30, path: "/categories/shirts" })
  })

  it("shows the empty text of the category", async () => {
    const wrapper = await mountSuspended(CategoryPage, { route: "/categories/shirts" })

    expect(wrapper.text()).toContain("This category has no products.")
  })
})
