import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav, ReviewForm } from "#components"
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

const shirtItem = {
  order_id: "order_1",
  order_display_id: 12,
  order_line_item_id: "ordli_1",
  product_id: "prod_1",
  product_title: "Plain T-Shirt",
  variant_title: "M",
  thumbnail: null,
}

const orderWithLines = {
  ...order("order_1", 12, 300000),
  items: [{ id: "ordli_1", product_title: "Plain T-Shirt", variant_title: "M", thumbnail: null, quantity: 2 }],
}

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

  it("shows the orders in the account nav", async () => {
    const wrapper = await mountPage()

    expect(wrapper.findComponent(AccountNav).exists()).toBe(true)
    expect(wrapper.find("h2").text()).toBe("Orders")
  })

  it("shows an empty state with a link to the products", async () => {
    const wrapper = await mountPage()
    const empty = wrapper.find('[data-slot="empty"]')

    expect(empty.text()).toContain("You have no orders.")
    expect(empty.find('a[href="/products"]').text()).toBe("Continue shopping")
  })

  it("shows each line of an order as an item with the quantity", async () => {
    orders.listOrders.mockResolvedValue({ orders: [orderWithLines], count: 1 })
    const wrapper = await mountPage()
    const card = wrapper.find('[data-testid="order-order_1"]')

    expect(card.find('[data-slot="item"]').text()).toContain("Plain T-Shirt")
    expect(card.find('[data-slot="item"]').text()).toContain("2")
    expect(card.find('a[href="/orders/order_1"]').text()).toBe("View the order")
  })

  it("opens the review form in a collapsible with the product name", async () => {
    orders.listOrders.mockResolvedValue({ orders: [orderWithLines], count: 1 })
    reviews.listReviewableItems.mockResolvedValue([shirtItem])
    const wrapper = await mountPage()
    const trigger = wrapper.find('[data-testid="order-order_1"] button[aria-expanded]')

    expect(trigger.text()).toBe("Write a review: Plain T-Shirt")
    expect(trigger.attributes("aria-expanded")).toBe("false")
    await trigger.trigger("click")

    expect(trigger.attributes("aria-expanded")).toBe("true")
  })

  it("shows the load error in a destructive alert", async () => {
    orders.listOrders.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    expect(wrapper.find('[data-slot="alert"][role="alert"]').text()).toBe("An error occurred. Try again.")
  })
})
