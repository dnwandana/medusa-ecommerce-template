import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import type { NuxtError } from "#app"
import { clearNuxtData } from "#imports"
import CategoryPage from "~/pages/categories/[handle].vue"

const { catalog } = vi.hoisted(() => ({
  catalog: { getCategoryByHandle: vi.fn() },
}))

mockNuxtImport("useCatalog", () => () => catalog)

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

const SHIRTS = {
  id: "pcat_1",
  name: "Shirts",
  handle: "shirts",
  description: "Relaxed shirts for most days.",
  parent_category: null,
  category_children: [],
}

const mountPage = (route: string) =>
  mountSuspended(CategoryPage, {
    route,
    global: { stubs: { CatalogListing: CatalogListingStub } },
  })

beforeEach(() => {
  clearNuxtData()
  catalog.getCategoryByHandle.mockReset().mockResolvedValue(SHIRTS)
})

describe("category page", () => {
  it("shows the name and the description", async () => {
    const wrapper = await mountPage("/categories/shirts")

    expect(wrapper.findAll("h1")).toHaveLength(1)
    expect(wrapper.find("h1").text()).toBe("Shirts")
    expect(wrapper.text()).toContain("Relaxed shirts for most days.")
  })

  it("shows Home / parent / category", async () => {
    catalog.getCategoryByHandle.mockResolvedValue({
      ...SHIRTS,
      parent_category: { id: "pcat_w", name: "Women", handle: "women" },
    })
    const wrapper = await mountPage("/categories/shirts")
    const crumbs = wrapper.find("nav[aria-label='Breadcrumb']")

    // The separators are list items too, so the test reads only the crumb items.
    expect(crumbs.findAll("li[data-slot='breadcrumb-item']").map((item) => item.text())).toEqual([
      "Home",
      "Women",
      "Shirts",
    ])
    expect(crumbs.find("a[href='/categories/women']").exists()).toBe(true)
    expect(crumbs.find("[aria-current='page']").text()).toBe("Shirts")
  })

  it("shows Home / category with no parent", async () => {
    const wrapper = await mountPage("/categories/shirts")
    const crumbs = wrapper.find("nav[aria-label='Breadcrumb']")

    expect(crumbs.text()).not.toContain("Products")
    expect(crumbs.findAll("li[data-slot='breadcrumb-item']").map((item) => item.text())).toEqual([
      "Home",
      "Shirts",
    ])
  })

  it("lists the products of the category with the empty state of a category", async () => {
    const wrapper = await mountPage("/categories/shirts")
    const listing = wrapper.findComponent({ name: "CatalogListing" })

    expect(listing.props("scope")).toEqual({ categoryId: "pcat_1", descendantIds: [] })
    expect(listing.props("emptyText")).toBe("This category has no products.")
    expect(listing.props("emptyBody")).toBe(
      "New pieces arrive each season. Browse the full collection in the meantime."
    )
    expect(listing.props("emptyAction")).toEqual({ label: "View all products", to: "/products" })
  })

  it("links All and the child categories, and gives the sheet the same links", async () => {
    catalog.getCategoryByHandle.mockResolvedValue({
      ...SHIRTS,
      category_children: [{ id: "pcat_3", name: "Linen shirts", handle: "linen-shirts", rank: 0 }],
    })
    const wrapper = await mountPage("/categories/shirts")
    const nav = wrapper.find("nav[aria-label='Categories']")

    expect(nav.findAll("a").map((link) => link.text())).toEqual(["All", "Linen shirts"])
    expect(nav.find("a[aria-current='page']").attributes("href")).toBe("/categories/shirts")
    expect(wrapper.findComponent({ name: "CatalogListing" }).props("categories")).toHaveLength(2)
  })

  it("lists the products of the descendant categories too", async () => {
    catalog.getCategoryByHandle.mockResolvedValue({
      ...SHIRTS,
      category_children: [
        {
          id: "pcat_3",
          name: "Linen shirts",
          handle: "linen-shirts",
          rank: 0,
          category_children: [{ id: "pcat_4", category_children: [] }],
        },
      ],
    })
    const wrapper = await mountPage("/categories/shirts")

    expect(wrapper.findComponent({ name: "CatalogListing" }).props("scope")).toEqual({
      categoryId: "pcat_1",
      descendantIds: ["pcat_3", "pcat_4"],
    })
  })

  it("shows no category links for a category with no children", async () => {
    const wrapper = await mountPage("/categories/shirts")

    expect(wrapper.find("nav[aria-label='Categories']").exists()).toBe(false)
  })

  it("throws a 404 with the message key", async () => {
    catalog.getCategoryByHandle.mockResolvedValue(null)
    await mountPage("/categories/missing")
    // mountSuspended does not reject. The fatal error goes to the Nuxt error state.
    const error = useError().value as NuxtError
    await clearError()
    expect(error.statusCode).toBe(404)
    expect(error.data).toEqual({ messageKey: "categories.notFound" })
    expect(error.statusMessage ?? "").not.toContain("not")
  })
})
