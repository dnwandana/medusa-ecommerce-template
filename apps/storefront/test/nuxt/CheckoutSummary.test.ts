import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CheckoutSummary } from "#components"

const cart = {
  id: "cart_1",
  item_subtotal: 300000,
  shipping_total: 18000,
  total: 318000,
  items: [
    { id: "item_1", product_title: "Plain T-Shirt", variant_title: "M", thumbnail: null, quantity: 2, unit_price: 150000 },
  ],
} as never

describe("CheckoutSummary", () => {
  it("shows the title and each cart line", async () => {
    const wrapper = await mountSuspended(CheckoutSummary, { props: { cart, showShipping: false } })

    expect(wrapper.find('[data-slot="card-title"]').text()).toBe("Order summary")
    expect(wrapper.text()).toContain("Plain T-Shirt")
    expect(wrapper.text()).toContain("M")
    expect(wrapper.text()).toContain("2 × Rp 150.000")
  })

  it("shows the subtotal only before the shipping option is saved", async () => {
    const wrapper = await mountSuspended(CheckoutSummary, { props: { cart, showShipping: false } })

    expect(wrapper.text()).toContain("Rp 300.000")
    expect(wrapper.text()).not.toContain("Total")
    expect(wrapper.text()).not.toContain("Rp 318.000")
  })

  it("shows the shipping and the total after the shipping option is saved", async () => {
    const wrapper = await mountSuspended(CheckoutSummary, { props: { cart, showShipping: true } })

    expect(wrapper.text()).toContain("Rp 18.000")
    expect(wrapper.text()).toContain("Total")
    expect(wrapper.find("dd.text-price-lg").text()).toBe("Rp 318.000")
  })
})
