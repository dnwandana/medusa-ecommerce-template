import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewForm } from "#components"
import OrdersPage from "~/pages/account/orders.vue"

const { orders, reviews } = vi.hoisted(() => ({
  orders: { listOrders: vi.fn(), getOrder: vi.fn() },
  reviews: { listReviewableItems: vi.fn(), submit: vi.fn(), listForProduct: vi.fn() },
}))

mockNuxtImport("useOrders", () => () => orders)
mockNuxtImport("useReviews", () => () => reviews)

const order = (id: string, displayId: number, total: number) => ({
  id,
  display_id: displayId,
  total,
  created_at: "2026-10-01T03:00:00.000Z",
  items: [],
})

const mountPage = async () => {
  const wrapper = await mountSuspended(OrdersPage)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  orders.listOrders.mockReset().mockResolvedValue({ orders: [], count: 0 })
  reviews.listReviewableItems.mockReset().mockResolvedValue([])
  reviews.submit.mockReset().mockResolvedValue(undefined)
})

describe("order history page", () => {
  it("shows a text when the customer has no orders", async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("You have no orders.")
  })

  it("shows each order with its number, its total, and a link", async () => {
    orders.listOrders.mockResolvedValue({
      orders: [order("order_2", 13, 318000), order("order_1", 12, 150000)],
      count: 2,
    })
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Order #13")
    expect(wrapper.text()).toContain("Rp 318.000")
    expect(wrapper.text()).toContain("Order #12")
    expect(wrapper.find('a[href="/orders/order_2"]').exists()).toBe(true)
  })

  it("shows a review form only for a reviewable item, in its order", async () => {
    orders.listOrders.mockResolvedValue({
      orders: [order("order_2", 13, 318000), order("order_1", 12, 150000)],
      count: 2,
    })
    reviews.listReviewableItems.mockResolvedValue([
      {
        order_id: "order_1",
        order_display_id: 12,
        order_line_item_id: "ordli_1",
        product_id: "prod_1",
        product_title: "Plain T-Shirt",
        variant_title: "M",
        thumbnail: null,
      },
    ])
    const wrapper = await mountPage()

    const forms = wrapper.findAllComponents(ReviewForm)
    expect(forms).toHaveLength(1)
    expect(forms[0]!.props("item").order_line_item_id).toBe("ordli_1")
    expect(wrapper.find('[data-testid="order-order_1"]').findComponent(ReviewForm).exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="order-order_2"]').findComponent(ReviewForm).exists()).toBe(
      false
    )
  })

  it("shows an error when the orders do not load", async () => {
    orders.listOrders.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("An error occurred. Try again.")
  })
})
