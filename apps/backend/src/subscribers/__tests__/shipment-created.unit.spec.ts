import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import shipmentCreatedHandler, { config } from "../shipment-created"

const fulfillment = {
  id: "ful_1",
  shipped_at: "2026-10-20T03:00:00.000Z",
  labels: [
    { tracking_number: "JP1234567890", tracking_url: "https://track.example.com/JP1234567890" },
  ],
  items: [{ line_item_id: "ordli_1", title: "Relaxed Linen Shirt", quantity: 1 }],
  order: {
    id: "order_123",
    display_id: 24117,
    email: "sari@example.com",
    shipping_address: { first_name: "Sari", city: "Jakarta Selatan" },
    shipping_methods: [{ name: "Standard Shipping" }],
    items: [{ id: "ordli_1", product_title: "Relaxed Linen Shirt", variant_title: "Sand / M" }],
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
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, graph, createNotifications, logger }
}

const run = (container: any, data: Record<string, unknown> = { id: "ful_1" }) =>
  shipmentCreatedHandler({
    event: { name: "shipment.created", data },
    container,
    pluginOptions: {},
  } as any)

describe("shipment-created subscriber", () => {
  it("listens for shipment.created", () => {
    expect(config.event).toBe("shipment.created")
  })

  it("sends the order-shipped email with the items and the labels of the shipment", async () => {
    const { container, createNotifications } = makeContainer([fulfillment])
    await run(container)
    expect(createNotifications).toHaveBeenCalledWith({
      to: "sari@example.com",
      channel: "email",
      template: "order-shipped",
      data: {
        order_url: "https://shop.example.com/orders/order_123",
        order: { display_id: 24117, shipping_address: fulfillment.order.shipping_address },
        shipment: {
          shipped_at: "2026-10-20T03:00:00.000Z",
          option_name: "Standard Shipping",
          items: [{ title: "Relaxed Linen Shirt", variant_title: "Sand / M", quantity: 1 }],
          labels: fulfillment.labels,
        },
      },
    })
  })

  it("uses the fulfillment item title when no order line matches", async () => {
    const { container, createNotifications } = makeContainer([
      { ...fulfillment, order: { ...fulfillment.order, items: [] } },
    ])
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.shipment.items).toEqual([
      { title: "Relaxed Linen Shirt", variant_title: null, quantity: 1 },
    ])
  })

  it("reads the fulfillment of the event", async () => {
    const { container, graph } = makeContainer([fulfillment])
    await run(container)
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "fulfillment", filters: { id: "ful_1" } })
    )
  })

  it("sends no email when the shipment has no_notification", async () => {
    const { container, graph, createNotifications } = makeContainer([fulfillment])
    await run(container, { id: "ful_1", no_notification: true })
    expect(graph).not.toHaveBeenCalled()
    expect(createNotifications).not.toHaveBeenCalled()
  })

  it("warns and sends nothing when the fulfillment is missing", async () => {
    const { container, createNotifications, logger } = makeContainer([])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it("warns and sends nothing for an order with no email", async () => {
    const { container, createNotifications, logger } = makeContainer([
      { ...fulfillment, order: { ...fulfillment.order, email: null } },
    ])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it("writes an error and does not throw when the email fails", async () => {
    const { container, createNotifications, logger } = makeContainer([fulfillment])
    createNotifications.mockRejectedValue(new Error("Brevo is down"))
    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The order-shipped email for fulfillment ful_1 failed. Cause: Brevo is down"
    )
  })
})
