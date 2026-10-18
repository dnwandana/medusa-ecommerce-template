import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { clearNuxtData } from "#imports"
import ProductsPage from "~/pages/products/index.vue"

const { catalog, navCategories } = await vi.hoisted(async () => {
  const { computed } = await import("vue")
  return {
    catalog: { listCategories: vi.fn() },
    navCategories: {
      categories: computed(() => [
        { id: "pcat_w", name: "Women", handle: "women" },
        { id: "pcat_m", name: "Men", handle: "men" },
      ]),
      pending: { value: false },
    },
  }
})

mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useNavCategories", () => () => navCategories)

// The listing has its own tests. The stub keeps the props for the assertions.
const CatalogListingStub = defineComponent({
  name: "CatalogListing",
  props: {
    scope: { type: Object, required: true },
    emptyText: { type: String, required: true },
    emptyBody: { type: String, default: undefined },
    emptyAction: { type: Object, default: undefined },
    categories: { type: Array, default: undefined },
  },
  setup: () => () => h("div"),
})

const mountPage = () =>
  mountSuspended(ProductsPage, {
    route: "/products",
    global: { stubs: { CatalogListing: CatalogListingStub } },
  })

beforeEach(() => {
  clearNuxtData()
  catalog.listCategories.mockReset().mockResolvedValue([])
})

describe("products page", () => {
  it("links All and the top-level categories", async () => {
    const wrapper = await mountPage()
    const nav = wrapper.find("nav[aria-label='Categories']")

    expect(nav.findAll("a").map((link) => link.text())).toEqual(["All", "Women", "Men"])
    expect(nav.find("a[aria-current='page']").attributes("href")).toBe("/products")
    expect(catalog.listCategories).not.toHaveBeenCalled()
  })

  it("lists all products with the empty state of All products", async () => {
    const wrapper = await mountPage()
    const listing = wrapper.findComponent({ name: "CatalogListing" })

    expect(listing.props("scope")).toEqual({})
    expect(listing.props("emptyText")).toBe("No products are available.")
    expect(listing.props("emptyBody")).toBe("New pieces arrive each season. Come back soon.")
    expect(listing.props("emptyAction")).toEqual({ label: "Back to home", to: "/" })
    expect(listing.props("categories")).toHaveLength(3)
  })

  it("has the page title and no breadcrumbs", async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll("h1")).toHaveLength(1)
    expect(wrapper.find("h1").text()).toBe("All products")
    expect(wrapper.find("nav[aria-label='Breadcrumb']").exists()).toBe(false)
  })
})
