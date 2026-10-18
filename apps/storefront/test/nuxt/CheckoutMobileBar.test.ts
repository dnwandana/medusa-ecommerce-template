import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CheckoutMobileBar } from "#components"

const cart = {
  id: "cart_1",
  item_subtotal: 300000,
  item_total: 300000,
  shipping_total: 18000,
  total: 318000,
  items: [
    {
      id: "item_1",
      product_title: "Linen Shirt",
      variant_title: "M / Sand",
      thumbnail: null,
      quantity: 2,
      unit_price: 150000,
      subtotal: 300000,
    },
  ],
} as never

describe("CheckoutMobileBar", () => {
  it("shows the total and opens the lines", async () => {
    const wrapper = await mountSuspended(CheckoutMobileBar, {
      props: { cart, showShipping: true },
    })
    const button = wrapper.get("button[aria-controls='checkout-mobile-summary']")
    expect(button.attributes("aria-expanded")).toBe("false")
    expect(button.text()).toContain("Show order summary")
    expect(button.text()).toContain("Rp 318.000")
    expect(wrapper.find("[data-testid='summary-line']").exists()).toBe(false)

    await button.trigger("click")
    expect(button.attributes("aria-expanded")).toBe("true")
    expect(button.text()).toContain("Hide order summary")
    expect(wrapper.find("#checkout-mobile-summary [data-testid='summary-line']").exists()).toBe(
      true
    )
    expect(wrapper.find("#checkout-mobile-summary h2").exists()).toBe(false)
  })

  it("shows the item total before a delivery method is selected", async () => {
    const wrapper = await mountSuspended(CheckoutMobileBar, {
      props: { cart, showShipping: false },
    })
    expect(wrapper.get("button").text()).toContain("Rp 300.000")
  })
})
