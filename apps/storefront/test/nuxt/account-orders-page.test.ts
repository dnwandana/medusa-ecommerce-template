import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav, HairlineAccordion, ReviewForm, Skeleton } from "#components"
import OrdersPage from "~/pages/account/orders.vue"
import enSource from "~~/i18n/locales/en.json?raw"

const { orders, reviews, customerStatus } = vi.hoisted(() => ({
  orders: { listOrders: vi.fn(), getOrder: vi.fn() },
  reviews: { listReviewableItems: vi.fn(), submit: vi.fn(), listForProduct: vi.fn() },
  customerStatus: vi.fn(),
}))

// The auth middleware of /account/orders reads customer and ensureLoaded.
const { customerState } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customerState: {
      customer: ref<unknown>({ id: "cus_1", email: "sari@example.com", first_name: "Sari" }),
      ensureLoaded: vi.fn(),
      logout: vi.fn(),
    },
  }
})

mockNuxtImport("useOrders", () => () => orders)
mockNuxtImport("useReviews", () => () => reviews)
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("customerStatus", () => customerStatus)

// The i18n plugin compiles a plain JSON import into message functions. The raw text keeps the
// strings. Payment base part 2 owns the text of `order.status.*`.
const english = JSON.parse(enSource) as Record<string, unknown>
const i18nText = (key: string): string =>
  key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], english) as string

const order = (id: string, displayId: number, total: number) => ({
  id,
  display_id: displayId,
  total,
  created_at: "2026-10-01T03:00:00.000Z",
  items: [],
})

const order1042 = {
  id: "order_1",
  display_id: 1042,
  total: 1056000,
  created_at: "2026-10-14T03:00:00.000Z",
  items: [
    {
      id: "ordli_1",
      product_title: "Silk Slip Dress",
      variant_title: "Clay / S",
      thumbnail: null,
      quantity: 1,
    },
    {
      id: "ordli_2",
      product_title: "Everyday Crew Tee",
      variant_title: "White / M",
      thumbnail: null,
      quantity: 2,
    },
  ],
}

const dressItem = {
  order_id: "order_1",
  order_display_id: 1042,
  order_line_item_id: "ordli_1",
  product_id: "prod_1",
  product_title: "Silk Slip Dress",
  variant_title: "Clay / S",
  thumbnail: null,
}

const mountPage = async () => {
  const wrapper = await mountSuspended(OrdersPage, { route: "/account/orders" })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  customerState.ensureLoaded.mockReset().mockResolvedValue(undefined)
  orders.listOrders.mockReset().mockResolvedValue({ orders: [], count: 0 })
  reviews.listReviewableItems.mockReset().mockResolvedValue([])
  reviews.submit.mockReset().mockResolvedValue(undefined)
  customerStatus.mockReset().mockReturnValue("processing")
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

  it("shows Date, Items and Total for each order", async () => {
    orders.listOrders.mockResolvedValue({ orders: [order1042], count: 1 })
    const wrapper = await mountPage()
    const block = wrapper.get('[data-testid="order-order_1"]')
    const labels = block.findAll("dt").map((term) => term.text())

    expect(labels).toEqual(["Date", "Items", "Total"])
    expect(block.findAll("dd")[0]!.text()).toBe("14 October 2026")
    expect(block.findAll("dd")[1]!.text()).toBe("3")
    expect(block.findAll("dd")[2]!.text()).toBe("Rp 1.056.000")
    expect(block.get("h3").text()).toBe("Order #1042")
    expect(block.get('a[href="/orders/order_1"]').text()).toBe("View the order")
  })

  it("shows each line with its variant and its quantity", async () => {
    orders.listOrders.mockResolvedValue({ orders: [order1042], count: 1 })
    const wrapper = await mountPage()
    const lines = wrapper.get('[data-testid="order-order_1"]').findAll("li")

    expect(lines).toHaveLength(2)
    expect(lines[1]!.text()).toContain("Everyday Crew Tee")
    expect(lines[1]!.text()).toContain("White / M")
    expect(lines[1]!.text()).toContain("× 2")
  })

  it("puts the review forms of an order in a hairline accordion", async () => {
    orders.listOrders.mockResolvedValue({ orders: [order1042], count: 1 })
    reviews.listReviewableItems.mockResolvedValue([dressItem])
    const wrapper = await mountPage()
    const group = wrapper.get('[aria-label="Review the items"]')

    expect(group.findComponent(HairlineAccordion).exists()).toBe(true)
    expect(group.text()).toContain("Write a review: Silk Slip Dress")
  })

  it("shows skeletons while the orders load", async () => {
    orders.listOrders.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSuspended(OrdersPage, { route: "/account/orders" })

    expect(wrapper.get('[role="status"]').text()).toContain("Loading…")
    expect(wrapper.findAllComponents(Skeleton).length).toBeGreaterThan(0)
  })

  it("loads again after Try again", async () => {
    orders.listOrders.mockRejectedValueOnce(new Error("HTTP 500"))
    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain("Your orders did not load.")
    await wrapper.get('[role="alert"] button').trigger("click")
    await flushPromises()

    expect(orders.listOrders).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it("shows the customer status of each order as an outline badge", async () => {
    orders.listOrders.mockResolvedValue({
      orders: [order1042, order("order_2", 13, 318000)],
      count: 2,
    })
    customerStatus.mockImplementation((value: { id: string }) =>
      value.id === "order_1" ? "shipped" : "waiting_for_payment"
    )
    const wrapper = await mountPage()
    const badge = wrapper.get('[data-testid="order-order_1"] [data-testid="order-status"]')
    expect(badge.attributes("data-variant")).toBe("outline")
    expect(badge.text()).toBe(i18nText("order.status.shipped"))
    expect(wrapper.get('[data-testid="order-order_2"] [data-testid="order-status"]').text()).toBe(
      i18nText("order.status.waiting_for_payment")
    )
  })

  it("puts the badge in the head row next to the order number", async () => {
    orders.listOrders.mockResolvedValue({ orders: [order1042], count: 1 })
    customerStatus.mockReturnValue("processing")
    const wrapper = await mountPage()
    const heading = wrapper.get('[data-testid="order-order_1"] h3')
    expect(
      heading.element.parentElement!.querySelector('[data-testid="order-status"]')
    ).not.toBeNull()
  })

  it("computes the status once for each order", async () => {
    orders.listOrders.mockResolvedValue({ orders: [order1042], count: 1 })
    await mountPage()
    expect(customerStatus).toHaveBeenCalledTimes(1)
  })
})
