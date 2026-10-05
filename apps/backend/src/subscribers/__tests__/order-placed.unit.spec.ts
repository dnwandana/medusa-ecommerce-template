import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import orderPlacedHandler, { config } from "../order-placed"

const order = {
  id: "order_123",
  display_id: 42,
  email: "buyer@example.com",
  total: 320000,
  shipping_total: 20000,
  items: [{ title: "Plain T-Shirt", variant_title: "M", quantity: 2, unit_price: 150000 }],
  shipping_address: { first_name: "Budi", last_name: "Santoso", city: "Jakarta" },
}

const makeContainer = (orders: unknown[], storefrontUrl = "https://shop.example.com") => {
  const graph = jest.fn().mockResolvedValue({ data: orders })
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

const run = (container: any) =>
  orderPlacedHandler({
    event: { name: "order.placed", data: { id: "order_123" } },
    container,
    pluginOptions: {},
  } as any)

describe("order-placed subscriber", () => {
  it("listens to the order.placed event", () => {
    expect(config.event).toBe("order.placed")
  })

  it("sends the order-placed email to the order email address", async () => {
    const { container, graph, createNotifications } = makeContainer([order])

    await run(container)

    expect(graph).toHaveBeenCalledWith({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "shipping_total",
        "items.title",
        "items.variant_title",
        "items.quantity",
        "items.unit_price",
        "shipping_address.*",
      ],
      filters: { id: "order_123" },
    })
    expect(createNotifications).toHaveBeenCalledWith({
      to: "buyer@example.com",
      channel: "email",
      template: "order-placed",
      data: { order, order_url: "https://shop.example.com/orders/order_123" },
    })
  })

  it("removes a trailing slash from the storefront URL", async () => {
    const { container, createNotifications } = makeContainer([order], "https://shop.example.com/")
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.order_url).toBe(
      "https://shop.example.com/orders/order_123"
    )
  })

  // Review Focus: an order with no email address.
  it("skips the send and logs a warning when the order has no email", async () => {
    const { container, createNotifications, logger } = makeContainer([{ ...order, email: null }])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-placed email was not sent. Order order_123 has no email address."
    )
  })

  it("logs a warning when the order does not exist", async () => {
    const { container, createNotifications, logger } = makeContainer([])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-placed email was not sent. Order order_123 was not found."
    )
  })

  it("logs the error and does not throw when the send fails", async () => {
    const { container, createNotifications, logger } = makeContainer([order])
    createNotifications.mockRejectedValue(new Error("Brevo is down"))

    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The order-placed email for order order_123 failed. Cause: Brevo is down"
    )
  })
})
