import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CartSummary } from "#components"

const cart = (items: object[]) =>
  ({ id: "cart_1", item_subtotal: 375000, item_total: 375000, items }) as never

describe("CartSummary", () => {
  it("shows the rows, the checkout link and the payment note", async () => {
    const wrapper = await mountSuspended(CartSummary, {
      props: { cart: cart([{ unit_price: 375000, compare_at_unit_price: 400000, quantity: 1 }]) },
    })
    expect(wrapper.get("h2").text()).toBe("Order summary")
    expect(wrapper.findAll("[data-slot='totals-row']").map((row) => row.text())).toEqual([
      "SubtotalRp 375.000",
      "You save-Rp 25.000",
      "DeliveryCalculated at checkout",
      "TotalRp 375.000",
    ])
    expect(wrapper.get("[data-testid='checkout']").attributes("href")).toBe("/checkout")
    expect(wrapper.text()).toContain("Choose your payment method at checkout.")
    expect(wrapper.text()).not.toMatch(/tax|promo|return/i)
  })

  it("hides You save when the cart has no savings", async () => {
    const wrapper = await mountSuspended(CartSummary, {
      props: { cart: cart([{ unit_price: 375000, compare_at_unit_price: null, quantity: 1 }]) },
    })
    expect(wrapper.find("[data-row='savings']").exists()).toBe(false)
  })

  it("shows the total in the checkout bar for phones", async () => {
    const wrapper = await mountSuspended(CartSummary, { props: { cart: cart([]) } })
    const bar = wrapper.get("[data-testid='checkout-bar']")
    expect(bar.classes()).toEqual(expect.arrayContaining(["fixed", "md:hidden"]))
    expect(bar.get("a").text()).toBe("Checkout · Rp 375.000")
    expect(bar.text()).toContain("Choose your payment method at checkout.")
  })

  it("blocks the checkout links during a cart change", async () => {
    const wrapper = await mountSuspended(CartSummary, { props: { cart: cart([]), disabled: true } })
    expect(wrapper.get("[data-testid='checkout']").attributes("aria-disabled")).toBe("true")
    expect(wrapper.get("[data-testid='checkout-bar'] a").attributes("aria-disabled")).toBe("true")
  })
})
