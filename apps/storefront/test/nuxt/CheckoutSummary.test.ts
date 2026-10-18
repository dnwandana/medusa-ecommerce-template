import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CheckoutSummary } from "#components"

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
      thumbnail: "https://example.com/shirt.jpg",
      quantity: 2,
      unit_price: 150000,
      compare_at_unit_price: 175000,
      subtotal: 300000,
    },
  ],
} as never

describe("CheckoutSummary", () => {
  it("shows each line with the quantity bubble and the line total", async () => {
    const wrapper = await mountSuspended(CheckoutSummary, { props: { cart, showShipping: false } })
    const line = wrapper.get("[data-testid='summary-line']")
    expect(line.text()).toContain("Linen Shirt")
    expect(line.text()).toContain("M / Sand")
    expect(line.text()).toContain("Rp 300.000")
    expect(line.get("[data-testid='quantity-bubble']").text()).toBe("2")
    expect(line.get("[data-testid='quantity-bubble']").attributes("aria-label")).toBe("Quantity: 2")
    expect(wrapper.get("a[href='/cart']").text()).toBe("Edit cart")
  })

  it("shows the savings and waits for a delivery method", async () => {
    const wrapper = await mountSuspended(CheckoutSummary, { props: { cart, showShipping: false } })
    expect(wrapper.get("[data-row='savings']").text()).toContain("-Rp 50.000")
    expect(wrapper.text()).toContain("Calculated at checkout")
    expect(wrapper.text()).toContain("Rp 300.000")
    expect(wrapper.text()).not.toContain("PPN")
  })

  it("adds the delivery price after a method is selected", async () => {
    const wrapper = await mountSuspended(CheckoutSummary, { props: { cart, showShipping: true } })
    expect(wrapper.text()).toContain("Rp 18.000")
    expect(wrapper.text()).toContain("Rp 318.000")
  })

  it("shows a muted box for a line with no thumbnail", async () => {
    const noPhoto = {
      ...(cart as { items: object[] }),
      items: [{ ...(cart as { items: object[] }).items[0], thumbnail: null }],
    } as never
    const wrapper = await mountSuspended(CheckoutSummary, {
      props: { cart: noPhoto, showShipping: false },
    })
    expect(wrapper.find("[data-testid='summary-line'] img").exists()).toBe(false)
  })

  it("hides the head row without the heading", async () => {
    const wrapper = await mountSuspended(CheckoutSummary, {
      props: { cart, showShipping: false, heading: false },
    })
    expect(wrapper.find("h2").exists()).toBe(false)
    expect(wrapper.find("a[href='/cart']").exists()).toBe(false)
  })
})
