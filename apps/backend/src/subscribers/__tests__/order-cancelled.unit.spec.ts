import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import orderCancelledHandler, { config } from "../order-cancelled"

const order = {
  id: "order_1",
  display_id: 42,
  email: "dewi@example.com",
  locale: "id-ID",
  created_at: "2026-10-20T07:30:00Z",
  total: 645000,
  shipping_total: 20000,
  metadata: null as Record<string, unknown> | null,
  shipping_methods: [{ name: "JNE Regular" }],
  items: [
    {
      title: "M",
      product_title: "Plain T-Shirt",
      variant_title: "M",
      quantity: 2,
      unit_price: 312500,
    },
  ],
  payment_collections: [] as unknown[],
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
    [STOREFRONT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({
        email: "hello@everyday.id",
        phone: null,
        whatsapp: null,
        address: null,
        social_links: [],
      }),
    },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, graph, createNotifications, logger }
}

const run = (container: any) =>
  orderCancelledHandler({
    event: { name: "order.canceled", data: { id: "order_1" } },
    container,
    pluginOptions: {},
  } as any)

describe("order-cancelled subscriber", () => {
  it("listens to order.canceled", () => {
    expect(config.event).toBe("order.canceled")
  })

  it("reads the order of the event with the fields of the email", async () => {
    const { container, graph } = makeContainer([order])
    await run(container)
    expect(graph).toHaveBeenCalledWith({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "locale",
        "created_at",
        "total",
        "shipping_total",
        "metadata",
        "items.title",
        "items.product_title",
        "items.variant_title",
        "items.quantity",
        "items.unit_price",
        "shipping_methods.name",
        "payment_collections.payments.provider_id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.amount",
      ],
      filters: { id: "order_1" },
    })
  })

  it("sends the timeout wording", async () => {
    const { container, createNotifications } = makeContainer([
      { ...order, metadata: { cancel_reason: "payment_timeout" } },
    ])
    await run(container)
    expect(createNotifications).toHaveBeenCalledWith({
      to: "dewi@example.com",
      channel: "email",
      template: "order-cancelled",
      data: {
        locale: "id-ID",
        store: {
          name: "Everyday",
          contact_email: "hello@everyday.id",
          whatsapp: null,
          phone: null,
        },
        shop_url: "https://shop.example.com/id",
        reason: "payment_timeout",
        deadline_hours: 24,
        note: null,
        refund: null,
        order: {
          display_id: 42,
          created_at: "2026-10-20T07:30:00.000Z",
          total: 645000,
          shipping_total: 20000,
          shipping_method: "JNE Regular",
          items: [{ title: "Plain T-Shirt", variant_title: "M", quantity: 2, unit_price: 312500 }],
        },
      },
    })
  })

  it("gives the deadline hours for a timeout cancel", async () => {
    const saved = process.env.BANK_TRANSFER_DEADLINE_HOURS
    process.env.BANK_TRANSFER_DEADLINE_HOURS = "48"
    try {
      const { container, createNotifications } = makeContainer([
        { ...order, metadata: { cancel_reason: "payment_timeout" } },
      ])
      await run(container)
      expect(createNotifications.mock.calls[0][0].data.deadline_hours).toBe(48)
    } finally {
      if (saved === undefined) {
        delete process.env.BANK_TRANSFER_DEADLINE_HOURS
      } else {
        process.env.BANK_TRANSFER_DEADLINE_HOURS = saved
      }
    }
  })

  it("gives no deadline hours for a staff cancel", async () => {
    const { container, createNotifications } = makeContainer([
      { ...order, metadata: { cancel_reason: "staff" } },
    ])
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect(data.deadline_hours).toBeUndefined()
    expect(data).not.toHaveProperty("deadline_hours")
  })

  it("sends the staff wording with the note and the bank refund", async () => {
    const { container, createNotifications } = makeContainer([
      {
        ...order,
        metadata: { cancel_reason: "staff", cancel_note: "Sorry" },
        payment_collections: [
          {
            payments: [
              {
                provider_id: "pp_bank-transfer_bank-transfer",
                captured_at: "2026-10-21T00:00:00Z",
                amount: 645000,
              },
            ],
          },
        ],
      },
    ])
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect([data.reason, data.note, data.refund]).toEqual([
      "staff",
      "Sorry",
      { amount: 645000, method: "bank_transfer" },
    ])
  })

  // Review checkpoint: the email says that the gateway refund comes in a separate email.
  it("gives the gateway method for a captured gateway payment", async () => {
    const { container, createNotifications } = makeContainer([
      {
        ...order,
        metadata: { cancel_reason: "staff" },
        payment_collections: [
          {
            payments: [
              { provider_id: "pp_test_test", captured_at: null, amount: 1000 },
              { provider_id: "pp_test_test", captured_at: "2026-10-21T00:00:00Z", amount: 645000 },
            ],
          },
        ],
      },
    ])
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.refund).toEqual({
      amount: 645000,
      method: "gateway",
    })
  })

  it("gives no refund when no payment is captured", async () => {
    const { container, createNotifications } = makeContainer([
      {
        ...order,
        metadata: { cancel_reason: "staff" },
        payment_collections: [
          {
            payments: [
              { provider_id: "pp_bank-transfer_bank-transfer", captured_at: null, amount: 1 },
            ],
          },
        ],
      },
    ])
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.refund).toBeNull()
  })

  it("treats a missing reason as staff with no note", async () => {
    const { container, createNotifications } = makeContainer([{ ...order, metadata: null }])
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect([data.reason, data.note]).toEqual(["staff", null])
  })

  // The cancel route and the timeout job write "" to remove a key, because Medusa merges
  // the metadata.
  it("treats an empty or a whitespace note as no note", async () => {
    for (const note of ["", "   "]) {
      const { container, createNotifications } = makeContainer([
        { ...order, metadata: { cancel_reason: "", cancel_note: note } },
      ])
      await run(container)
      const { data } = createNotifications.mock.calls[0][0]
      expect([data.reason, data.note]).toEqual(["staff", null])
    }
  })

  it("trims the note", async () => {
    const { container, createNotifications } = makeContainer([
      { ...order, metadata: { cancel_reason: "staff", cancel_note: "  Out of stock \n" } },
    ])
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.note).toBe("Out of stock")
  })

  it("uses English and the storefront home with no prefix for an order with no locale", async () => {
    const { container, createNotifications } = makeContainer(
      [{ ...order, locale: null }],
      "https://shop.example.com/"
    )
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect([data.locale, data.shop_url]).toEqual(["en-US", "https://shop.example.com"])
  })

  it("warns and sends nothing without STOREFRONT_URL", async () => {
    const { container, createNotifications, logger } = makeContainer([order], "")
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-cancelled email was not sent. STOREFRONT_URL has no value."
    )
  })

  it("warns and sends nothing for an order with no email", async () => {
    const { container, createNotifications, logger } = makeContainer([{ ...order, email: null }])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-cancelled email was not sent. Order order_1 has no email address."
    )
  })

  it("warns and sends nothing when the order does not exist", async () => {
    const { container, createNotifications, logger } = makeContainer([])
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-cancelled email was not sent. Order order_1 was not found."
    )
  })

  it("logs the error and does not throw when the send fails", async () => {
    const { container, createNotifications, logger } = makeContainer([order])
    createNotifications.mockRejectedValue(new Error("SMTP is down"))
    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The order-cancelled email for order order_1 failed. Cause: SMTP is down"
    )
  })
})
