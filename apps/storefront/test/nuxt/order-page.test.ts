import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import OrderPage from "~/pages/orders/[id].vue"

const { orders, bankTransfer } = vi.hoisted(() => ({
  orders: { getOrder: vi.fn(), listOrders: vi.fn() },
  bankTransfer: { getDetails: vi.fn() },
}))

mockNuxtImport("useOrders", () => () => orders)
mockNuxtImport("useBankTransfer", () => () => bankTransfer)

const bankOrder = {
  id: "order_1",
  display_id: 12,
  email: "buyer@example.com",
  item_subtotal: 300000,
  shipping_total: 18000,
  total: 318000,
  created_at: "2026-10-17T07:30:00Z",
  items: [],
  shipping_address: null,
  payment_collections: [
    { status: "authorized", payment_sessions: [{ provider_id: "pp_bank-transfer_bank-transfer" }] },
  ],
}

const details = {
  bank_accounts: [
    { id: "ba_1", bank_name: "BCA", account_number: "0123456789", account_holder: "Toko" },
  ],
  contact: { email: null, whatsapp: null },
}

beforeEach(() => {
  clearNuxtData()
  orders.getOrder.mockReset()
  bankTransfer.getDetails.mockReset()
})

describe("order page", () => {
  it("shows the thanks text, the email address, and the summary", async () => {
    orders.getOrder.mockResolvedValue({
      id: "order_1",
      display_id: 12,
      email: "buyer@example.com",
      item_subtotal: 300000,
      shipping_total: 18000,
      total: 318000,
      items: [],
      shipping_address: null,
    })

    const wrapper = await mountSuspended(OrderPage, { route: "/orders/order_1" })

    expect(orders.getOrder).toHaveBeenCalledWith("order_1")
    expect(wrapper.text()).toContain("Thank you for your order")
    expect(wrapper.text()).toContain("We sent a confirmation to buyer@example.com.")
    expect(wrapper.text()).toContain("Order #12")
    expect(wrapper.find(".bg-success-soft svg").exists()).toBe(true)
    expect(wrapper.find("h1").text()).toBe("Thank you for your order")
    expect(wrapper.find('a[href="/products"]').text()).toBe("Continue shopping")
    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false)
    // An order with no payment collections is not a bank transfer order.
    expect(wrapper.text()).not.toContain("Pay by bank transfer")
    expect(bankTransfer.getDetails).not.toHaveBeenCalled()
  })

  it("shows the bank transfer instructions for an unpaid bank transfer order", async () => {
    orders.getOrder.mockResolvedValue(bankOrder)
    bankTransfer.getDetails.mockResolvedValue(details)

    const wrapper = await mountSuspended(OrderPage, { route: "/orders/order_1" })

    expect(wrapper.text()).toContain("Pay by bank transfer")
    expect(wrapper.find('[data-testid="bank-transfer-amount"]').text()).toBe("Rp 318.000")
    expect(wrapper.text()).toContain("0123456789")
    expect(wrapper.text()).toContain("Transfer before 18 October 2026, 14:30 WIB.")
    // The instructions come before the order summary, so that the customer sees them first.
    expect(wrapper.html().indexOf("Pay by bank transfer")).toBeLessThan(
      wrapper.html().indexOf("Order #12")
    )
  })

  // Review Focus: a captured order must not show the bank details.
  it("shows no instructions for a captured order", async () => {
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_collections: [{ ...bankOrder.payment_collections[0], status: "completed" }],
    })

    const wrapper = await mountSuspended(OrderPage, { route: "/orders/order_1" })

    expect(wrapper.text()).toContain("Thank you for your order")
    expect(wrapper.text()).not.toContain("Pay by bank transfer")
    expect(bankTransfer.getDetails).not.toHaveBeenCalled()
  })

  // Review Focus: a gateway order must not show the bank details.
  it("shows no instructions for a gateway order", async () => {
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_collections: [
        { status: "authorized", payment_sessions: [{ provider_id: "pp_gateway_gateway" }] },
      ],
    })

    const wrapper = await mountSuspended(OrderPage, { route: "/orders/order_1" })

    expect(wrapper.text()).toContain("Thank you for your order")
    expect(wrapper.text()).not.toContain("Pay by bank transfer")
    expect(bankTransfer.getDetails).not.toHaveBeenCalled()
  })

  it("shows the contact text when the bank details do not load", async () => {
    orders.getOrder.mockResolvedValue(bankOrder)
    bankTransfer.getDetails.mockRejectedValue(new Error("down"))

    const wrapper = await mountSuspended(OrderPage, { route: "/orders/order_1" })

    expect(wrapper.text()).toContain("The bank details are not available. Contact the store.")
    expect(wrapper.text()).toContain("Thank you for your order")
    expect(wrapper.text()).toContain("Order #12")
  })
})
