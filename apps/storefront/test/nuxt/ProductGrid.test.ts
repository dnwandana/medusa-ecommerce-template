import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { ProductCard, ProductGrid } from "#components"

const products = [
  { id: "prod_1", title: "Plain T-Shirt", handle: "plain-t-shirt", thumbnail: null, variants: [] },
  { id: "prod_2", title: "Wide Chino", handle: "wide-chino", thumbnail: null, variants: [] },
] as never[]

const mountGrid = (props: Record<string, unknown>) =>
  mountSuspended(ProductGrid, {
    props: { products, emptyText: "No products are available.", ...props },
  })

describe("ProductGrid", () => {
  it("shows one card for each product in the responsive grid", async () => {
    const wrapper = await mountGrid({})

    expect(wrapper.findAllComponents(ProductCard)).toHaveLength(2)
    expect(wrapper.find(".grid").classes()).toEqual(
      expect.arrayContaining([
        "grid-cols-2",
        "gap-3",
        "md:grid-cols-3",
        "md:gap-6",
        "lg:grid-cols-4",
      ])
    )
  })

  it("shows the skeleton cards while the page loads", async () => {
    const wrapper = await mountGrid({ loading: true })

    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(12)
    expect(wrapper.findAllComponents(ProductCard)).toHaveLength(0)
  })

  it("shows the empty state with the empty text", async () => {
    const wrapper = await mountGrid({ products: [] })

    expect(wrapper.text()).toContain("No products are available.")
    expect(wrapper.findAllComponents(ProductCard)).toHaveLength(0)
  })

  it("shows a destructive alert when the products do not load", async () => {
    const wrapper = await mountGrid({ products: [], error: true })

    expect(wrapper.find('[role="alert"]').text()).toBe("An error occurred. Try again.")
    expect(wrapper.text()).not.toContain("No products are available.")
  })
})
