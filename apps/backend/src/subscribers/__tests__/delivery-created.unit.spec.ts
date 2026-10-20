import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import deliveryCreatedHandler, { config } from "../delivery-created"

const fulfillment = {
  id: "ful_1",
  shipped_at: "2026-10-20T03:00:00.000Z",
  delivered_at: "2026-10-24T05:00:00Z",
  labels: [
    { tracking_number: "JP1234567890", tracking_url: "https://track.example.com/JP1234567890" },
  ],
  items: [{ line_item_id: "ordli_1", title: "M", quantity: 2 }],
  order: {
    id: "order_123",
    display_id: 24117,
    email: "sari@example.com",
    locale: "en-US",
    shipping_address: { first_name: "Sari", city: "Jakarta Selatan" },
    shipping_methods: [{ name: "Standard Shipping" }],
    items: [{ id: "ordli_1", product_title: "Plain T-Shirt", variant_title: "M" }],
  },
}

const makeContainer = (fulfillments: unknown[], storefrontUrl = "https://shop.example.com") => {
  const graph = jest.fn().mockResolvedValue({ data: fulfillments })
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.NOTIFICATION]: { createNotifications },
    [BANK_ACCOUNT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({ email: "hello@everyday.id", whatsapp: null }),
    },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, graph, createNotifications, logger }
}

const run = (container: any, data: Record<string, unknown> = { id: "ful_1" }) =>
  deliveryCreatedHandler({
    event: { name: "delivery.created", data },
    container,
    pluginOptions: {},
  } as any)

describe("delivery-created subscriber", () => {
  it("listens to delivery.created", () => {
    expect(config.event).toBe("delivery.created")
  })

  it("reads the fulfillment of the event with delivered_at", async () => {
    const { container, graph } = makeContainer([fulfillment])
    await run(container)
    const call = graph.mock.calls[0][0]
    expect(call.entity).toBe("fulfillment")
    expect(call.filters).toEqual({ id: "ful_1" })
    expect(call.fields).toEqual(expect.arrayContaining(["delivered_at", "order.locale"]))
  })

  it("sends the delivered email", async () => {
    const { container, createNotifications } = makeContainer([fulfillment])
    await run(container)
    expect(createNotifications).toHaveBeenCalledWith({
      to: "sari@example.com",
      channel: "email",
      template: "order-delivered",
      data: {
        locale: "en-US",
        store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
        order_url: "https://shop.example.com/orders/order_123",
        order: { display_id: 24117 },
        delivery: {
          delivered_at: "2026-10-24T05:00:00.000Z",
          items: [{ title: "Plain T-Shirt", variant_title: "M", quantity: 2 }],
        },
      },
    })
  })

  it("passes the locale and the Indonesian link", async () => {
    const { container, createNotifications } = makeContainer([
      { ...fulfillment, order: { ...fulfillment.order, locale: "id-ID" } },
    ])
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect([data.locale, data.order_url]).toEqual([
      "id-ID",
      "https://shop.example.com/id/orders/order_123",
    ])
  })

  it("uses the time of the send when delivered_at has no value", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-25T01:02:03.000Z"))
    try {
      const { container, createNotifications } = makeContainer([
        { ...fulfillment, delivered_at: null },
      ])
      await run(container)
      expect(createNotifications.mock.calls[0][0].data.delivery.delivered_at).toBe(
        "2026-10-25T01:02:03.000Z"
      )
    } finally {
      jest.useRealTimers()
    }
  })

  it("skips on no_notification", async () => {
    const { container, graph, createNotifications } = makeContainer([fulfillment])
    await run(container, { id: "ful_1", no_notification: true })
    expect(graph).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("warns without a fulfillment", async () => {
    const { container, createNotifications, logger } = makeContainer([])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-delivered email was not sent. Fulfillment ful_1 was not found."
    )
  })

  it("warns for a fulfillment with no order", async () => {
    const { container, createNotifications, logger } = makeContainer([
      { ...fulfillment, order: null },
    ])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-delivered email was not sent. Fulfillment ful_1 has no order."
    )
  })

  it("warns for an order with no email", async () => {
    const { container, createNotifications, logger } = makeContainer([
      { ...fulfillment, order: { ...fulfillment.order, email: null } },
    ])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-delivered email was not sent. Order order_123 has no email address."
    )
  })

  it("warns and sends nothing without STOREFRONT_URL", async () => {
    const { container, createNotifications, logger } = makeContainer([fulfillment], "")
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-delivered email was not sent. STOREFRONT_URL has no value."
    )
  })

  it("writes an error and does not throw when the email fails", async () => {
    const { container, createNotifications, logger } = makeContainer([fulfillment])
    createNotifications.mockRejectedValue(new Error("SMTP is down"))
    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The order-delivered email for fulfillment ful_1 failed. Cause: SMTP is down"
    )
  })
})
