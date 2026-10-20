import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import { runReviewRequests } from "../run"

const NOW = new Date("2026-10-27T20:00:00Z")

type TestOrder = Record<string, any> & { id: string }

const makeOrder = (id: string, extra: Record<string, unknown> = {}): TestOrder => ({
  id,
  display_id: 1042,
  status: "completed",
  email: "sari@example.com",
  locale: "en-US",
  metadata: { source: "test" },
  shipping_address: { first_name: "Sari" },
  fulfillments: [{ delivered_at: "2026-10-20T00:00:00Z" }],
  items: [
    {
      id: `${id}_item_1`,
      title: "Relaxed Linen Shirt",
      product_id: "prod_1",
      product_title: "Relaxed Linen Shirt",
      variant_title: "Sand / M",
      thumbnail: "https://cdn.example.com/shirt.jpg",
      detail: { shipped_quantity: 1 },
    },
    {
      id: `${id}_item_2`,
      title: "Canvas Tote",
      product_id: "prod_2",
      product_title: "Canvas Tote",
      variant_title: null,
      thumbnail: null,
      detail: { shipped_quantity: 1 },
    },
  ],
  ...extra,
})

const makeContainer = (
  orders: TestOrder[],
  {
    reviewed = [] as string[],
    storefrontUrl = "https://shop.example.com",
    reread = (order: TestOrder | undefined) => order,
  } = {}
) => {
  // The first read is the selection. Each later read has an id filter and reads one order.
  const graph = jest.fn(async ({ filters }: { filters: Record<string, unknown> }) => {
    if (typeof filters.id === "string") {
      const found = reread(orders.find((o) => o.id === filters.id))
      return { data: found ? [found] : [] }
    }
    return { data: orders }
  })
  const createNotifications = jest.fn().mockResolvedValue({})
  const updateOrders = jest.fn().mockResolvedValue({})
  const listReviews = jest.fn(async ({ order_line_item_id }: { order_line_item_id: string[] }) =>
    order_line_item_id
      .filter((id) => reviewed.includes(id))
      .map((id) => ({ order_line_item_id: id }))
  )
  const lockKeys: string[] = []
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.NOTIFICATION]: { createNotifications },
    [Modules.ORDER]: { updateOrders },
    [Modules.LOCKING]: {
      execute: (key: string, fn: () => Promise<unknown>) => {
        lockKeys.push(key)
        return fn()
      },
    },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
    [BANK_ACCOUNT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({ email: "hello@everyday.id", whatsapp: null }),
    },
    [PRODUCT_REVIEW_MODULE]: { listReviews },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, graph, createNotifications, updateOrders, listReviews, lockKeys, logger }
}

const MARK = { metadata: { review_request_sent_at: NOW.toISOString() } }

describe("runReviewRequests", () => {
  it("reads the orders that are not cancelled and that have a delivery in the window", async () => {
    const { container, graph } = makeContainer([])
    await expect(runReviewRequests(container, NOW)).resolves.toEqual({
      sent: [],
      skipped: [],
      failed: [],
    })
    expect(graph).toHaveBeenCalledTimes(1)
    expect(graph.mock.calls[0][0]).toMatchObject({
      entity: "order",
      filters: {
        status: { $ne: "canceled" },
        fulfillments: {
          delivered_at: {
            $gte: new Date("2026-09-20T20:00:00Z"),
            $lte: new Date("2026-10-20T20:00:00Z"),
          },
        },
      },
    })
  })

  it("sends for the unreviewed products and writes the mark", async () => {
    const order = makeOrder("order_1")
    const { container, createNotifications, updateOrders, listReviews, lockKeys } = makeContainer(
      [order],
      { reviewed: ["order_1_item_1"] }
    )

    const result = await runReviewRequests(container, NOW)

    expect(result).toEqual({ sent: ["order_1"], skipped: [], failed: [] })
    expect(lockKeys).toEqual(["review-request:order_1"])
    expect(listReviews).toHaveBeenCalledWith(
      { order_line_item_id: ["order_1_item_1", "order_1_item_2"] },
      { select: ["order_line_item_id"] }
    )
    expect(createNotifications).toHaveBeenCalledWith({
      to: "sari@example.com",
      channel: "email",
      template: "review-request",
      data: {
        locale: "en-US",
        store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
        review_url: "https://shop.example.com/account/orders",
        first_name: "Sari",
        order: { display_id: 1042 },
        products: [{ title: "Canvas Tote", variant_title: null, thumbnail: null }],
      },
    })
    // Medusa merges the metadata, so the mark alone keeps the other keys.
    expect(updateOrders).toHaveBeenCalledWith("order_1", MARK)
    // The mark goes in before the send, so a later run cannot send a second request.
    expect(updateOrders.mock.invocationCallOrder[0]).toBeLessThan(
      createNotifications.mock.invocationCallOrder[0]
    )
  })

  it("uses the Indonesian link and the line item title when the product title is missing", async () => {
    const order = makeOrder("order_1", {
      locale: "id-ID",
      shipping_address: null,
      items: [
        {
          id: "order_1_item_1",
          title: "Kemeja Linen",
          product_id: "prod_1",
          product_title: null,
          variant_title: "M",
          thumbnail: null,
          detail: { shipped_quantity: 1 },
        },
      ],
    })
    const { container, createNotifications } = makeContainer([order])

    await runReviewRequests(container, NOW)

    const { data } = createNotifications.mock.calls[0][0]
    expect(data.locale).toBe("id-ID")
    expect(data.review_url).toBe("https://shop.example.com/id/account/orders")
    expect(data.first_name).toBeNull()
    expect(data.products).toEqual([{ title: "Kemeja Linen", variant_title: "M", thumbnail: null }])
  })

  it("writes the mark and sends nothing when every product is reviewed", async () => {
    const { container, createNotifications, updateOrders } = makeContainer([makeOrder("order_1")], {
      reviewed: ["order_1_item_1", "order_1_item_2"],
    })

    const result = await runReviewRequests(container, NOW)

    expect(result).toEqual({ sent: [], skipped: ["order_1"], failed: [] })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(updateOrders).toHaveBeenCalledWith("order_1", MARK)
  })

  it("writes the mark and sends nothing when the order has no email", async () => {
    const { container, createNotifications, updateOrders, logger } = makeContainer([
      makeOrder("order_1", { email: null }),
    ])

    const result = await runReviewRequests(container, NOW)

    expect(result).toEqual({ sent: [], skipped: ["order_1"], failed: [] })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(updateOrders).toHaveBeenCalledWith("order_1", MARK)
    expect(logger.warn).toHaveBeenCalledWith(
      "The review request for order order_1 was not sent. The order has no email address."
    )
  })

  it("continues after a failed order", async () => {
    const { container, createNotifications, updateOrders, logger } = makeContainer([
      makeOrder("order_1"),
      makeOrder("order_2", { fulfillments: [{ delivered_at: "2026-10-20T01:00:00Z" }] }),
    ])
    createNotifications.mockRejectedValueOnce(new Error("SMTP is down"))

    const result = await runReviewRequests(container, NOW)

    expect(result).toEqual({ sent: ["order_2"], skipped: [], failed: ["order_1"] })
    // The next run tries order_1 again, because the job removes its mark after the failed send.
    expect(updateOrders.mock.calls).toEqual([
      ["order_1", MARK],
      ["order_1", { metadata: { review_request_sent_at: "" } }],
      ["order_2", MARK],
    ])
    expect(logger.error).toHaveBeenCalledWith(
      "The review request for order order_1 failed. Cause: SMTP is down"
    )
  })

  it("does nothing for an order that got the mark after the selection", async () => {
    const { container, createNotifications, updateOrders } = makeContainer([makeOrder("order_1")], {
      reread: (order) =>
        order && { ...order, metadata: { review_request_sent_at: "2026-10-27T19:59:00Z" } },
    })

    const result = await runReviewRequests(container, NOW)

    expect(result).toEqual({ sent: [], skipped: [], failed: [] })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(updateOrders).not.toHaveBeenCalled()
  })

  it("sends nothing and writes no mark when the storefront URL has no value", async () => {
    const { container, createNotifications, updateOrders, logger } = makeContainer(
      [makeOrder("order_1")],
      { storefrontUrl: "" }
    )

    const result = await runReviewRequests(container, NOW)

    expect(result).toEqual({ sent: [], skipped: [], failed: [] })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(updateOrders).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The review requests were not sent. STOREFRONT_URL has no value."
    )
  })
})
