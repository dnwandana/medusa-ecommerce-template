import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, nextTick } from "vue"
import type { NuxtError } from "#app"
import { clearNuxtData, useNuxtApp } from "#imports"
import CategoryPage from "~/pages/categories/[handle].vue"
import { readHead } from "./helpers/head"

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
  emits: ["first-thumbnail"],
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

const WOMEN = { id: "pcat_w", name: "Women", handle: "women" }

const mountPage = (route: string) =>
  mountSuspended(CategoryPage, {
    route,
    global: { stubs: { CatalogListing: CatalogListingStub } },
  })

beforeEach(() => {
  clearNuxtData()
  catalog.getCategoryByHandle.mockReset().mockResolvedValue(SHIRTS)
})

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale("en")
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

  it("writes the category head and the breadcrumbs", async () => {
    catalog.getCategoryByHandle.mockResolvedValue({ ...SHIRTS, parent_category: WOMEN })
    await mountPage("/categories/shirts")
    const head = await readHead()

    expect(head.title).toBe("Shirts | Everyday")
    expect(head.meta("description")).toBe("Relaxed shirts for most days.")
    expect(head.meta("og:image")).toBe("http://localhost:3000/og-default.jpg")
    expect(head.links("canonical")).toEqual([{ href: "http://localhost:3000/categories/shirts" }])
    expect(head.jsonLd()).toEqual([
      expect.objectContaining({
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "http://localhost:3000/" },
          {
            "@type": "ListItem",
            position: 2,
            name: "Women",
            item: "http://localhost:3000/categories/women",
          },
          { "@type": "ListItem", position: 3, name: "Shirts" },
        ],
      }),
    ])
  })

  it("writes Home / category in the breadcrumbs with no parent", async () => {
    await mountPage("/categories/shirts")

    expect((await readHead()).jsonLd()[0]?.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "http://localhost:3000/" },
      { "@type": "ListItem", position: 2, name: "Shirts" },
    ])
  })

  it("writes the breadcrumb URLs in the page locale", async () => {
    catalog.getCategoryByHandle.mockResolvedValue({ ...SHIRTS, parent_category: WOMEN })
    await mountPage("/id/categories/shirts")
    const head = await readHead()

    expect(head.links("canonical")).toEqual([
      { href: "http://localhost:3000/id/categories/shirts" },
    ])
    expect(head.jsonLd()[0]?.itemListElement).toEqual([
      expect.objectContaining({ position: 1, item: "http://localhost:3000/id" }),
      expect.objectContaining({ position: 2, item: "http://localhost:3000/id/categories/women" }),
      { "@type": "ListItem", position: 3, name: "Shirts" },
    ])
  })

  it("uses the locale text for a category with no description", async () => {
    catalog.getCategoryByHandle.mockResolvedValue({ ...SHIRTS, description: null })
    await mountPage("/categories/shirts")

    expect((await readHead()).meta("description")).toBe("Shop Shirts at Everyday.")
  })

  it("uses the thumbnail of the first product as the share image", async () => {
    const wrapper = await mountPage("/categories/shirts")
    wrapper
      .findComponent({ name: "CatalogListing" })
      .vm.$emit("first-thumbnail", "https://cdn.example/f.jpg")
    await nextTick()
    const head = await readHead()

    expect(head.meta("og:image")).toBe("https://cdn.example/f.jpg")
    expect(head.meta("og:image:alt")).toBe("Shirts")
    expect(head.meta("og:image:width")).toBeNull()
  })
})
