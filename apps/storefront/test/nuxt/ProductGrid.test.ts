import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import { ProductCard, ProductGrid } from "#components"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"

const { storefront, customerState } = await vi.hoisted(async () => {
  const { computed, ref } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    storefront: {
      ensureSettings: vi.fn(),
      settings: computed(() => STOREFRONT_DEFAULTS),
    },
    customerState: { customer: ref(null), ensureLoaded: () => Promise.resolve() },
  }
})

mockNuxtImport("useStorefront", () => () => storefront)
// The hearts of the cards load the customer. A guest makes no wishlist request.
mockNuxtImport("useCustomer", () => () => customerState)

const products = [
  { id: "prod_1", title: "Plain T-Shirt", handle: "plain-t-shirt", thumbnail: null, variants: [] },
  { id: "prod_2", title: "Wide Chino", handle: "wide-chino", thumbnail: null, variants: [] },
] as never[]

const mountGrid = (props: Record<string, unknown>) =>
  mountSuspended(ProductGrid, {
    props: { products, emptyText: "No products are available.", ...props },
  })

beforeEach(() => {
  clearNuxtData()
  storefront.ensureSettings.mockReset().mockResolvedValue(STOREFRONT_DEFAULTS)
})

describe("ProductGrid", () => {
  it("shows one card for each product in the responsive grid", async () => {
    const wrapper = await mountGrid({})

    expect(wrapper.findAllComponents(ProductCard)).toHaveLength(2)
    expect(wrapper.find(".grid").classes()).toEqual(
      expect.arrayContaining([
        "grid-cols-2",
        "gap-x-2",
        "gap-y-8",
        "md:grid-cols-3",
        "lg:grid-cols-4",
        "lg:gap-x-8",
        "lg:gap-y-12",
      ])
    )
  })

  it("shows the skeleton cards while the page loads", async () => {
    const wrapper = await mountGrid({ loading: true })

    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(12)
    expect(wrapper.findAllComponents(ProductCard)).toHaveLength(0)
  })

  it("shows 12 square-cornered 4:5 skeleton cards while it loads", async () => {
    const wrapper = await mountGrid({ loading: true })
    const photos = wrapper.findAll("[data-testid='skeleton-photo']")

    expect(photos).toHaveLength(12)
    expect(photos[0]!.attributes("style")).toContain("4 / 5")
    expect(
      wrapper.find("[data-testid='skeleton-photo'] [data-slot='skeleton']").classes()
    ).not.toContain("rounded-lg")
  })

  it("shows the empty state with the empty text", async () => {
    const wrapper = await mountGrid({ products: [] })

    expect(wrapper.text()).toContain("No products are available.")
    expect(wrapper.findAllComponents(ProductCard)).toHaveLength(0)
  })

  it("shows the empty title, the line and the action", async () => {
    const wrapper = await mountGrid({
      products: [],
      emptyText: "This category has no products.",
      emptyBody: "New pieces arrive each season. Come back soon.",
      emptyAction: { label: "View all products", to: "/products" },
    })

    expect(wrapper.find("[data-slot='empty-title']").text()).toBe("This category has no products.")
    expect(wrapper.text()).toContain("New pieces arrive each season. Come back soon.")
    expect(wrapper.find("a[href='/products']").text()).toBe("View all products")
  })

  it("shows a destructive alert when the products do not load", async () => {
    const wrapper = await mountGrid({ products: [], error: true })

    expect(wrapper.find('[role="alert"]').text()).toContain("An error occurred. Try again.")
    expect(wrapper.text()).not.toContain("No products are available.")
  })

  it("shows the error with a Try again button", async () => {
    const wrapper = await mountGrid({ error: true })

    expect(wrapper.find("[role='alert']").text()).toContain("An error occurred. Try again.")
    await wrapper.find("button").trigger("click")
    expect(wrapper.emitted("retry")).toHaveLength(1)
  })

  it("loads the storefront settings for the cards", async () => {
    await mountGrid({})
    expect(storefront.ensureSettings).toHaveBeenCalled()
  })
})
