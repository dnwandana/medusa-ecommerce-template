import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { clearNuxtData } from "#imports"
import SearchPage from "~/pages/search.vue"

const { catalog, storefront, customerState, navigateToMock, count } = await vi.hoisted(async () => {
  const { computed, ref } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    catalog: { listProducts: vi.fn() },
    storefront: {
      ensureSettings: () => Promise.resolve(STOREFRONT_DEFAULTS),
      settings: computed(() => STOREFRONT_DEFAULTS),
    },
    customerState: { customer: ref(null), ensureLoaded: () => Promise.resolve() },
    navigateToMock: vi.fn(),
    count: ref(0),
  }
})

mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useStorefront", () => () => storefront)
// The hearts of the cards load the customer. A guest makes no wishlist request.
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("navigateTo", () => navigateToMock)

// The listing has its own tests. The stub gives the count to the top slot and shows the empty slot.
const CatalogListingStub = defineComponent({
  name: "CatalogListing",
  props: { scope: { type: Object, required: true }, emptyText: { type: String, required: true } },
  setup:
    (_props, { slots }) =>
    () =>
      h("div", [slots.top?.({ count: count.value }), slots.empty?.()]),
})

const mountPage = (route: string) =>
  mountSuspended(SearchPage, { route, global: { stubs: { CatalogListing: CatalogListingStub } } })

beforeEach(() => {
  clearNuxtData()
  count.value = 0
  navigateToMock.mockReset()
  catalog.listProducts.mockReset().mockResolvedValue({
    products: Array.from({ length: 4 }, (_, i) => ({
      id: `p_${i}`,
      title: `P ${i}`,
      handle: `p-${i}`,
      variants: [],
    })),
    count: 4,
  })
})

describe("search page", () => {
  it("shows only the title and the form with no text", async () => {
    const wrapper = await mountPage("/search")

    expect(wrapper.get("h1").text()).toBe("Search")
    expect(wrapper.find("form[role='search']").exists()).toBe(true)
    expect(wrapper.findComponent({ name: "CatalogListing" }).exists()).toBe(false)
    expect(catalog.listProducts).not.toHaveBeenCalled()
  })

  it("lists the results of the text", async () => {
    count.value = 4
    const wrapper = await mountPage("/search?q=%20linen%20")

    expect(wrapper.findComponent({ name: "CatalogListing" }).props("scope")).toEqual({
      q: "linen",
    })
    expect(wrapper.get("h1").text()).toBe('Results for "linen"')
    expect(wrapper.text()).toContain("4 products")
    expect(wrapper.get<HTMLInputElement>("input[type='search']").element.value).toBe("linen")
  })

  it("shows the no-match line, View all products and New in", async () => {
    count.value = 0
    const wrapper = await mountPage("/search?q=velvet")
    // The New in products load after the page shows.
    await flushPromises()

    expect(wrapper.get("h1").text()).toBe('No results for "velvet"')
    expect(wrapper.text()).toContain(
      'No products match "velvet". Check the spelling, or try a shorter word.'
    )
    expect(wrapper.get("a[href='/products']").text()).toBe("View all products")
    expect(catalog.listProducts).toHaveBeenCalledWith({ limit: 4 })
    expect(wrapper.findAll("[data-testid='card-photo']")).toHaveLength(4)
  })

  it("shows no New in block when the request fails", async () => {
    catalog.listProducts.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage("/search?q=velvet")
    await flushPromises()

    expect(wrapper.text()).not.toContain("New in")
    expect(wrapper.find("[role='alert']").exists()).toBe(false)
  })

  it("searches again from the form", async () => {
    const wrapper = await mountPage("/search?q=linen")
    await wrapper.get("input[type='search']").setValue("silk")
    await wrapper.get("form").trigger("submit")

    expect(navigateToMock).toHaveBeenCalledWith("/search?q=silk")
  })
})
