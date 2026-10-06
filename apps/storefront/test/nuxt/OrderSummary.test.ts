import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { OrderSummary } from "#components"

const order = {
  id: "order_1",
  display_id: 12,
  email: "buyer@example.com",
  item_subtotal: 300000,
  shipping_total: 18000,
  total: 318000,
  items: [
    {
      id: "item_1",
      product_title: "Plain T-Shirt",
      variant_title: "M",
      quantity: 2,
      unit_price: 150000,
    },
  ],
  shipping_address: {
    first_name: "Sari",
    last_name: "Dewi",
    address_1: "Jl. Merdeka No. 1",
    city: "Bandung",
    province: "Jawa Barat",
    postal_code: "40111",
    phone: "+6281234567890",
  },
} as never

describe("OrderSummary", () => {
  it("shows the order number, the items, and the totals", async () => {
    const wrapper = await mountSuspended(OrderSummary, { props: { order } })

    expect(wrapper.text()).toContain("Order #12")
    expect(wrapper.text()).toContain("Plain T-Shirt")
    expect(wrapper.text()).toContain("2 × Rp 150.000")
    expect(wrapper.find('[data-testid="order-subtotal"]').text()).toBe("Rp 300.000")
    expect(wrapper.find('[data-testid="order-shipping"]').text()).toBe("Rp 18.000")
    expect(wrapper.find('[data-testid="order-total"]').text()).toBe("Rp 318.000")
  })

  it("shows the shipping address", async () => {
    const wrapper = await mountSuspended(OrderSummary, { props: { order } })

    expect(wrapper.text()).toContain("Sari Dewi")
    expect(wrapper.text()).toContain("Jl. Merdeka No. 1")
    expect(wrapper.text()).toContain("Bandung")
    expect(wrapper.text()).toContain("40111")
  })
  it("shows the items, the totals, and the address in three cards in a grid of 3fr and 2fr", async () => {
    const wrapper = await mountSuspended(OrderSummary, { props: { order } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(["grid", "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"]))
    expect(wrapper.findAll('[data-slot="card"]')).toHaveLength(3)
    expect(wrapper.find('[data-slot="card-title"]').text()).toBe("Order #12")
  })

  it("shows each line as an item", async () => {
    const wrapper = await mountSuspended(OrderSummary, { props: { order } })

    expect(wrapper.find('[data-slot="item"]').text()).toContain("Plain T-Shirt")
  })

  it("shows no address card when the order has no address", async () => {
    const wrapper = await mountSuspended(OrderSummary, {
      props: { order: { ...(order as object), shipping_address: null } as never },
    })

    expect(wrapper.findAll('[data-slot="card"]')).toHaveLength(2)
  })
})
