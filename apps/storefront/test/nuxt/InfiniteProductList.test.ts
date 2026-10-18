import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import { InfiniteProductList } from "#components"

const { storefront, customerState } = await vi.hoisted(async () => {
  const { computed, ref } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    storefront: {
      ensureSettings: () => Promise.resolve(STOREFRONT_DEFAULTS),
      settings: computed(() => STOREFRONT_DEFAULTS),
    },
    customerState: { customer: ref(null), ensureLoaded: () => Promise.resolve() },
  }
})

mockNuxtImport("useStorefront", () => () => storefront)
// The hearts of the cards load the customer. A guest makes no wishlist request.
mockNuxtImport("useCustomer", () => () => customerState)

// The test calls the callback of the last observer, as the browser does when the sentinel shows.
let intersect: (entries: Array<{ isIntersecting: boolean }>) => void = () => {}

class FakeIntersectionObserver {
  constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
    intersect = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver)

afterAll(() => {
  vi.unstubAllGlobals()
})

beforeEach(() => {
  clearNuxtData()
  intersect = () => {}
})

const products = (n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `p_${start + i}`,
    title: `P ${start + i}`,
    handle: `p-${start + i}`,
    variants: [],
  }))

const base = {
  products: products(12),
  count: 48,
  loading: false,
  error: false,
  loadingMore: false,
  loadMoreError: false,
  nextPageTo: { query: { page: "2" } },
  emptyText: "This category has no products.",
}

describe("InfiniteProductList", () => {
  it("renders a real next page link and hides it after the mount", async () => {
    const wrapper = await mountSuspended(InfiniteProductList, { props: base })
    const link = wrapper.find("[data-testid='next-page']")

    expect(link.attributes("href")).toBe("/?page=2")
    expect(link.text()).toBe("Next page")
    expect(link.classes()).toContain("hidden")
  })

  it("asks for the next page when the sentinel comes into view", async () => {
    const wrapper = await mountSuspended(InfiniteProductList, { props: base })
    intersect([{ isIntersecting: true }])

    expect(wrapper.emitted("load-more")).toHaveLength(1)
  })

  it("does not ask again while it loads or after a failed fetch", async () => {
    const wrapper = await mountSuspended(InfiniteProductList, {
      props: { ...base, loadingMore: true },
    })
    intersect([{ isIntersecting: true }])
    expect(wrapper.emitted("load-more")).toBeUndefined()
    expect(wrapper.text()).toContain("Loading more pieces")

    await wrapper.setProps({ loadingMore: false, loadMoreError: true })
    intersect([{ isIntersecting: true }])
    expect(wrapper.emitted("load-more")).toBeUndefined()
    expect(wrapper.text()).toContain("The next pieces did not load.")

    // The hearts of the cards are buttons too, so the test finds the retry button by its id.
    await wrapper.find("[data-testid='load-more-retry']").trigger("click")
    expect(wrapper.emitted("load-more")).toHaveLength(1)
  })

  it("does not ask for a page after the last page", async () => {
    const wrapper = await mountSuspended(InfiniteProductList, {
      props: { ...base, nextPageTo: null },
    })
    intersect([{ isIntersecting: true }])

    expect(wrapper.emitted("load-more")).toBeUndefined()
  })

  it("says the end of the list with the count", async () => {
    const wrapper = await mountSuspended(InfiniteProductList, {
      props: { ...base, products: products(48), nextPageTo: null },
    })

    expect(wrapper.text()).toContain("You have seen all 48 pieces")
    expect(wrapper.find("[data-testid='next-page']").exists()).toBe(false)
  })

  it("tells a screen reader how many products loaded", async () => {
    const wrapper = await mountSuspended(InfiniteProductList, { props: base })
    await wrapper.setProps({ products: products(24) })

    expect(wrapper.find("[aria-live='polite']").text()).toBe("12 more products loaded")
  })
})
