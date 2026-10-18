import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { OrderSummary } from "#components"

const order = {
  id: "order_1",
  display_id: 24117,
  email: "sari@example.com",
  item_subtotal: 359000,
  shipping_total: 18000,
  total: 377000,
  items: [
    {
      id: "item_1",
      product_id: "prod_1",
      product_title: "Relaxed Linen Shirt",
      variant_title: "Sand · Size M",
      thumbnail: "https://example.com/shirt.jpg",
      quantity: 1,
      unit_price: 359000,
      subtotal: 359000,
    },
  ],
  shipping_address: {
    first_name: "Sari",
    last_name: "Wulandari",
    address_1: "Jl. Kemang Raya No. 12",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postal_code: "12730",
    phone: "+62 812 3456 7890",
  },
  shipping_methods: [{ name: "Standard Shipping", amount: 18000 }],
  summary: { refunded_total: 0 },
  payment_state: {
    order_id: "order_1",
    provider_id: "pp_bank-transfer_bank-transfer",
    captured_at: null,
    receipts: [],
    note: null,
  },
}

const mountSummary = (value: object, status: string, cancelReason: string | null = null) =>
  mountSuspended(OrderSummary, {
    props: { order: value as never, status: status as never, cancelReason },
  })

describe("OrderSummary", () => {
  it("shows the subtotal, the delivery price and the total", async () => {
    const wrapper = await mountSummary(order, "waiting_for_payment")

    expect(wrapper.get('[data-testid="order-subtotal"]').text()).toContain("Rp 359.000")
    expect(wrapper.get('[data-testid="order-shipping"]').text()).toContain("Rp 18.000")
    expect(wrapper.get('[data-testid="order-total"]').text()).toContain("Rp 377.000")
    expect(wrapper.find('[data-slot="card"]').exists()).toBe(false)
  })

  it("shows the address in the details row", async () => {
    const details = (await mountSummary(order, "processing")).get('[data-testid="order-details"]')

    expect(details.text()).toContain("Delivering to")
    expect(details.text()).toContain("Sari Wulandari")
    expect(details.text()).toContain("Jl. Kemang Raya No. 12")
    expect(details.text()).toContain("Jakarta Selatan, DKI Jakarta 12730")
    expect(details.text()).toContain("+62 812 3456 7890")
  })

  it("shows Free for a delivery price of 0", async () => {
    const wrapper = await mountSummary({ ...order, shipping_total: 0 }, "processing")
    expect(wrapper.get('[data-testid="order-shipping"]').text()).toContain("Free")
  })

  it("shows Total paid after the payment and Total before it", async () => {
    expect(
      (await mountSummary(order, "processing")).get('[data-testid="order-total"]').text()
    ).toContain("Total paid")
    expect(
      (await mountSummary(order, "waiting_for_payment")).get('[data-testid="order-total"]').text()
    ).not.toContain("paid")
  })

  it.each([
    ["waiting_for_payment", null, "Awaiting your transfer"],
    ["payment_submitted", null, "Checking your receipt"],
    ["shipped", null, "Received"],
    ["cancelled", "payment_timeout", "Not received"],
    ["cancelled", null, "Cancelled"],
    ["refunded", null, "Refunded"],
  ])("shows the payment state for %s", async (status, cancelReason, text) => {
    const wrapper = await mountSummary(order, status, cancelReason)
    expect(wrapper.get('[data-testid="order-details"]').text()).toContain(text)
  })

  it("shows the name of the shipping option and the payment method", async () => {
    const details = (await mountSummary(order, "processing")).get('[data-testid="order-details"]')
    expect(details.text()).toContain("Standard Shipping")
    expect(details.text()).toContain("Bank transfer")
  })

  it("shows the generic name for a gateway with no locale key", async () => {
    const gateway = { ...order, payment_state: { ...order.payment_state, provider_id: "pp_x_x" } }
    const details = (await mountSummary(gateway, "processing")).get('[data-testid="order-details"]')
    expect(details.text()).toContain("Online payment")
  })

  it("adds a Refunded row and the refund text for a partial refund", async () => {
    const refunded = { ...order, summary: { refunded_total: 50000 } }
    const wrapper = await mountSummary(refunded, "shipped")
    expect(wrapper.get('[data-testid="order-refunded"]').text()).toContain("−Rp 50.000")
    expect(wrapper.text()).toContain("We refunded Rp 50.000 to you.")
  })

  it("adds no refund text for a refunded order, because the status block shows it", async () => {
    const refunded = { ...order, summary: { refunded_total: 377000 } }
    const wrapper = await mountSummary(refunded, "refunded")
    expect(wrapper.get('[data-testid="order-refunded"]').text()).toContain("−Rp 377.000")
    expect(wrapper.text()).not.toContain("We refunded")
  })

  it("shows no Refunded row with no refund", async () => {
    const wrapper = await mountSummary(order, "shipped")
    expect(wrapper.find('[data-testid="order-refunded"]').exists()).toBe(false)
  })

  it("shows the variant and the quantity of each line", async () => {
    const wrapper = await mountSummary(order, "processing")
    expect(wrapper.get("h2").text()).toBe("Order #24117 items")
    expect(wrapper.text()).toContain("Relaxed Linen Shirt")
    expect(wrapper.text()).toContain("Sand · Size M · Qty 1")
    expect(wrapper.find("img").attributes("src")).toBe("https://example.com/shirt.jpg")
  })
})
