import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { clearNuxtData, useRouter } from "#imports"
import { CatalogFilterBar, CatalogListing, InfiniteProductList } from "#components"
import { EMPTY_CATALOG_STATE } from "~/utils/catalogQuery"

const { listing, storefront, customerState } = await vi.hoisted(async () => {
  const { computed, ref } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  const settings = { ...STOREFRONT_DEFAULTS, price_limits: [500000, 1000000] }
  return {
    listing: { listFilters: vi.fn(), listPage: vi.fn() },
    storefront: {
      ensureSettings: vi.fn(),
      settings: computed(() => settings),
      SETTINGS: settings,
    },
    customerState: { customer: ref(null), ensureLoaded: () => Promise.resolve() },
  }
})

mockNuxtImport("useCatalogListing", () => () => listing)
mockNuxtImport("useStorefront", () => () => storefront)
// The hearts of the cards load the customer. A guest makes no wishlist request.
mockNuxtImport("useCustomer", () => () => customerState)

vi.stubGlobal(
  "IntersectionObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
)

const VALUES = {
  sizes: [
    { key: "xs", label: "XS", ids: ["ov_xs"] },
    { key: "m", label: "M", ids: ["ov_m"] },
  ],
  colours: [
    { key: "sage", label: "Sage", ids: ["ov_sage"] },
    { key: "ink", label: "Ink", ids: ["ov_ink"] },
  ],
  fabrics: [{ key: "linen", label: "Linen", ids: ["tag_1"] }],
}

const pageOf = (page: number) => ({
  products: Array.from({ length: 10 }, (_, i) => ({
    id: `p_${page}_${i}`,
    title: `P ${page} ${i}`,
    handle: `p-${page}-${i}`,
    variants: [],
  })),
  count: 30,
})

const Host = defineComponent({
  setup: () => () =>
    h(
      CatalogListing,
      { scope: {}, emptyText: "No products." },
      { empty: () => h("p", { "data-testid": "custom-empty" }) }
    ),
})

const SearchHost = defineComponent({
  setup: () => () => h(CatalogListing, { scope: { q: "linen" }, emptyText: "No products." }),
})

beforeEach(() => {
  clearNuxtData()
  listing.listFilters.mockReset().mockResolvedValue(VALUES)
  listing.listPage
    .mockReset()
    .mockImplementation((_scope, _state, _values, _limits, page: number) =>
      Promise.resolve(pageOf(page))
    )
  storefront.ensureSettings.mockReset().mockResolvedValue(storefront.SETTINGS)
})

describe("CatalogListing", () => {
  it("reads the filters and the sort from the URL", async () => {
    await mountSuspended(Host, { route: "/products?colour=sage&size=m&sort=price-asc" })

    expect(listing.listPage).toHaveBeenCalledWith(
      {},
      { ...EMPTY_CATALOG_STATE, colour: ["sage"], size: ["m"], sort: "price-asc" },
      VALUES,
      [500000, 1000000],
      1
    )
  })

  it("loads the pages up to the page in the URL", async () => {
    const wrapper = await mountSuspended(Host, { route: "/products?page=3" })

    expect(listing.listPage.mock.calls.map((call) => call[4])).toEqual([1, 2, 3])
    expect(wrapper.findAll("[data-testid='card-photo']")).toHaveLength(30)
  })

  it("loads at most 10 pages at once", async () => {
    await mountSuspended(Host, { route: "/products?page=40" })

    expect(listing.listPage).toHaveBeenCalledTimes(10)
  })

  it("puts a filter change in the URL", async () => {
    const wrapper = await mountSuspended(Host, { route: "/products" })
    const router = useRouter()
    const push = vi.spyOn(router, "push")
    wrapper
      .findComponent(CatalogFilterBar)
      .vm.$emit("update:state", { ...EMPTY_CATALOG_STATE, fabric: ["linen"] })

    expect(push).toHaveBeenCalledWith({ query: { fabric: "linen" } })
    push.mockRestore()
  })

  it("keeps the search text in the URL", async () => {
    const wrapper = await mountSuspended(SearchHost, { route: "/search?q=linen" })
    const push = vi.spyOn(useRouter(), "push")
    wrapper
      .findComponent(CatalogFilterBar)
      .vm.$emit("update:state", { ...EMPTY_CATALOG_STATE, size: ["m"] })

    expect(push).toHaveBeenCalledWith({ query: { q: "linen", size: "m" } })
    push.mockRestore()
  })

  it("adds the next page and changes the URL to it", async () => {
    const wrapper = await mountSuspended(Host, { route: "/products" })
    const replace = vi.spyOn(useRouter(), "replace")
    wrapper.findComponent(InfiniteProductList).vm.$emit("load-more")
    await flushPromises()

    expect(listing.listPage).toHaveBeenLastCalledWith(
      {},
      EMPTY_CATALOG_STATE,
      VALUES,
      [500000, 1000000],
      2
    )
    expect(replace).toHaveBeenCalledWith({ query: { page: "2" } })
    expect(wrapper.findAll("[data-testid='card-photo']")).toHaveLength(20)
    replace.mockRestore()
  })

  it("shows the load error and fetches the same page again", async () => {
    const wrapper = await mountSuspended(Host, { route: "/products" })
    const replace = vi.spyOn(useRouter(), "replace")
    listing.listPage.mockRejectedValueOnce(new Error("HTTP 500"))
    wrapper.findComponent(InfiniteProductList).vm.$emit("load-more")
    await flushPromises()

    expect(wrapper.findComponent(InfiniteProductList).props("loadMoreError")).toBe(true)
    wrapper.findComponent(InfiniteProductList).vm.$emit("load-more")
    await flushPromises()

    expect(listing.listPage.mock.calls.map((call) => call[4])).toEqual([1, 2, 2])
    replace.mockRestore()
  })

  it("shows the no-match state with the chips and Clear all filters", async () => {
    listing.listPage.mockResolvedValue({ products: [], count: 0 })
    const wrapper = await mountSuspended(Host, { route: "/products?fabric=linen" })

    expect(wrapper.text()).toContain("No pieces match these filters")
    expect(wrapper.find("button[aria-label='Remove filter: Linen']").exists()).toBe(true)
    expect(wrapper.text()).toContain("Clear all filters")
  })

  it("emits the thumbnail of the first product", async () => {
    listing.listPage.mockResolvedValue({
      products: [
        { id: "p_1", title: "P 1", handle: "p-1", thumbnail: "/first.jpg", variants: [] },
        { id: "p_2", title: "P 2", handle: "p-2", thumbnail: "/second.jpg", variants: [] },
      ],
      count: 2,
    })
    const wrapper = await mountSuspended(CatalogListing, {
      props: { scope: {}, emptyText: "No products." },
      route: "/products",
    })

    expect(wrapper.emitted("first-thumbnail")?.at(-1)).toEqual(["/first.jpg"])
  })

  it("emits null when the list has no product", async () => {
    listing.listPage.mockResolvedValue({ products: [], count: 0 })
    const wrapper = await mountSuspended(CatalogListing, {
      props: { scope: {}, emptyText: "No products." },
      route: "/products",
    })

    expect(wrapper.emitted("first-thumbnail")?.at(-1)).toEqual([null])
  })

  it("shows the empty slot only with no active filter", async () => {
    listing.listPage.mockResolvedValue({ products: [], count: 0 })
    const wrapper = await mountSuspended(Host, { route: "/products" })

    expect(wrapper.find("[data-testid='custom-empty']").exists()).toBe(true)
  })
})
