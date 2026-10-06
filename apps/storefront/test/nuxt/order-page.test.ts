import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import OrderPage from "~/pages/orders/[id].vue"

const { orders } = vi.hoisted(() => ({
  orders: { getOrder: vi.fn(), listOrders: vi.fn() },
}))

mockNuxtImport("useOrders", () => () => orders)

beforeEach(() => {
  clearNuxtData()
  orders.getOrder.mockReset()
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
  })
})
