import {
  findOrderItem,
  listReviewableItems,
  OrderForReview,
  OrderItemForReview,
  REVIEW_ORDER_FIELDS,
  shippedQuantity,
} from "../reviewable"

const item = (id: string, shipped: unknown, overrides: Partial<OrderItemForReview> = {}) => ({
  id,
  product_id: `prod_${id}`,
  product_title: `Product ${id}`,
  variant_title: "M",
  thumbnail: `https://assets.test/${id}.jpg`,
  detail: { shipped_quantity: shipped },
  ...overrides,
})

const order = (id: string, displayId: number, items: OrderForReview["items"]): OrderForReview => ({
  id,
  display_id: displayId,
  items,
})

describe("REVIEW_ORDER_FIELDS", () => {
  it("asks for each field that the rules read", () => {
    expect(REVIEW_ORDER_FIELDS).toEqual([
      "id",
      "display_id",
      "items.id",
      "items.product_id",
      "items.product_title",
      "items.variant_title",
      "items.thumbnail",
      "items.detail.shipped_quantity",
    ])
  })
})

describe("shippedQuantity", () => {
  // Review Focus: a shipped quantity that arrives as text or as an object.
  it.each([
    [2, 2],
    ["2", 2],
    [{ numeric: 2 }, 2],
    [{ value: "2" }, 2],
    [0, 0],
    ["0", 0],
    [undefined, 0],
    [null, 0],
    ["abc", 0],
    [{}, 0],
  ])("reads %p as %p", (raw, expected) => {
    expect(shippedQuantity(item("a", raw))).toBe(expected)
  })

  it("returns 0 for an item with no detail", () => {
    expect(shippedQuantity(item("a", 0, { detail: null }))).toBe(0)
  })
})

describe("findOrderItem", () => {
  const orders = [order("order_1", 1, [item("a", 1)]), order("order_2", 2, [item("b", 0)])]

  it("finds an item in a later order", () => {
    expect(findOrderItem(orders, "b")?.id).toBe("b")
  })

  it("returns undefined for an unknown item", () => {
    expect(findOrderItem(orders, "zzz")).toBeUndefined()
  })

  it("accepts an order with no items", () => {
    expect(findOrderItem([order("order_3", 3, null)], "a")).toBeUndefined()
  })
})

describe("listReviewableItems", () => {
  // Review Focus: an order that ships in parts.
  it("lists an item with 1 of 3 units shipped and omits an item with 0 units shipped", () => {
    const orders = [order("order_1", 7, [item("a", 1), item("b", 0)])]

    expect(listReviewableItems(orders, [])).toEqual([
      {
        order_id: "order_1",
        order_display_id: 7,
        order_line_item_id: "a",
        product_id: "prod_a",
        product_title: "Product a",
        variant_title: "M",
        thumbnail: "https://assets.test/a.jpg",
      },
    ])
  })

  it("omits an item that has a review", () => {
    const orders = [order("order_1", 1, [item("a", 1), item("b", 2)])]

    expect(listReviewableItems(orders, ["a"]).map((i) => i.order_line_item_id)).toEqual(["b"])
  })

  it("lists the same product one time for each purchase", () => {
    const orders = [
      order("order_1", 1, [item("a", 1, { product_id: "prod_same" })]),
      order("order_2", 2, [item("b", 1, { product_id: "prod_same" })]),
    ]

    expect(listReviewableItems(orders, ["a"]).map((i) => i.order_line_item_id)).toEqual(["b"])
  })

  it("omits an item with no product", () => {
    const orders = [order("order_1", 1, [item("a", 1, { product_id: null })])]

    expect(listReviewableItems(orders, [])).toEqual([])
  })

  it("keeps the sequence of the orders and of the items", () => {
    const orders = [
      order("order_2", 2, [item("c", 1), item("d", 1)]),
      order("order_1", 1, [item("a", 1)]),
    ]

    expect(listReviewableItems(orders, []).map((i) => i.order_line_item_id)).toEqual([
      "c",
      "d",
      "a",
    ])
  })

  it("returns an empty list for no orders, and for an order with no items", () => {
    expect(listReviewableItems([], [])).toEqual([])
    expect(listReviewableItems([order("order_1", 1, null)], [])).toEqual([])
    expect(listReviewableItems([order("order_1", 1, [null])], [])).toEqual([])
  })
})
