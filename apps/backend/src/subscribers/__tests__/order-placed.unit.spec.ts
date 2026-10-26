import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import orderPlacedHandler, { config } from "../order-placed"

const order = {
  id: "order_123",
  display_id: 42,
  email: "buyer@example.com",
  locale: "id-ID",
  created_at: "2026-10-17T07:30:00Z",
  total: 320000,
  shipping_total: 20000,
  shipping_methods: [{ name: "JNE Regular" }],
  items: [
    {
      title: "Plain T-Shirt",
      product_title: "Plain T-Shirt",
      variant_title: "M",
      quantity: 2,
      unit_price: 150000,
    },
  ],
  shipping_address: { first_name: "Budi", last_name: "Santoso", city: "Jakarta" },
}

const bankTransferOrder = {
  ...order,
  total: 318000,
  payment_collections: [
    {
      status: "authorized",
      payment_sessions: [{ provider_id: "pp_bank-transfer_bank-transfer" }],
    },
  ],
}

const accounts = [
  {
    id: "ba_1",
    bank_name: "BCA",
    account_number: "0123456789",
    account_holder: "Toko",
    is_active: true,
    rank: 0,
  },
]

const makeContainer = (orders: unknown[], storefrontUrl = "https://shop.example.com") => {
  const graph = jest.fn().mockResolvedValue({ data: orders })
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const bankAccountService = {
    listBankAccounts: jest.fn().mockResolvedValue(accounts),
    getContact: jest.fn().mockResolvedValue({ email: "hello@everyday.id", whatsapp: null }),
  }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.NOTIFICATION]: { createNotifications },
    [BANK_ACCOUNT_MODULE]: bankAccountService,
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, graph, createNotifications, logger, bankAccountService }
}

const sentTemplates = (createNotifications: jest.Mock) =>
  createNotifications.mock.calls.map(([call]) => call.template)

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
        "locale",
        "created_at",
        "total",
        "shipping_total",
        "shipping_methods.name",
        "items.title",
        "items.product_title",
        "items.variant_title",
        "items.quantity",
        "items.unit_price",
        "shipping_address.*",
        "payment_collections.status",
        "payment_collections.payment_sessions.provider_id",
      ],
      filters: { id: "order_123" },
    })
    expect(createNotifications).toHaveBeenCalledWith({
      to: "buyer@example.com",
      channel: "email",
      template: "order-placed",
      data: {
        locale: "id-ID",
        store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
        order_url: "https://shop.example.com/id/orders/order_123",
        order: {
          display_id: 42,
          email: "buyer@example.com",
          created_at: "2026-10-17T07:30:00.000Z",
          total: 320000,
          shipping_total: 20000,
          shipping_method: "JNE Regular",
          items: [{ title: "Plain T-Shirt", variant_title: "M", quantity: 2, unit_price: 150000 }],
          shipping_address: order.shipping_address,
        },
      },
    })
  })

  it("adds the active accounts and the deadline for a bank transfer order", async () => {
    const { container, createNotifications, bankAccountService } = makeContainer([
      bankTransferOrder,
    ])

    await run(container)

    expect(bankAccountService.listBankAccounts).toHaveBeenCalledWith(
      { is_active: true },
      { order: { rank: "ASC", created_at: "ASC" } }
    )
    expect(createNotifications.mock.calls[0][0].data.bank_transfer).toEqual({
      amount: 318000,
      deadline: "18 Oktober 2026, 14.30 WIB",
      accounts: [{ bank_name: "BCA", account_number: "0123456789", account_holder: "Toko" }],
    })
  })

  it("adds the deadline of BANK_TRANSFER_DEADLINE_HOURS to the order time", async () => {
    const saved = process.env.BANK_TRANSFER_DEADLINE_HOURS
    process.env.BANK_TRANSFER_DEADLINE_HOURS = "48"
    try {
      const { container, createNotifications } = makeContainer([bankTransferOrder])

      await run(container)

      expect(createNotifications.mock.calls[0][0].data.bank_transfer.deadline).toBe(
        "19 Oktober 2026, 14.30 WIB"
      )
    } finally {
      if (saved === undefined) {
        delete process.env.BANK_TRANSFER_DEADLINE_HOURS
      } else {
        process.env.BANK_TRANSFER_DEADLINE_HOURS = saved
      }
    }
  })

  // Review Focus: a gateway order email does not show the bank details.
  it("adds no bank details for a gateway order", async () => {
    const { container, createNotifications, bankAccountService } = makeContainer([
      {
        ...bankTransferOrder,
        payment_collections: [
          { status: "authorized", payment_sessions: [{ provider_id: "pp_test_test" }] },
        ],
      },
    ])

    await run(container)

    expect(bankAccountService.listBankAccounts).not.toHaveBeenCalled()
    expect(createNotifications.mock.calls[0][0].data).not.toHaveProperty("bank_transfer")
  })

  it("adds no bank details for a captured bank transfer order", async () => {
    const { container, createNotifications, bankAccountService } = makeContainer([
      {
        ...bankTransferOrder,
        payment_collections: [
          {
            status: "completed",
            payment_sessions: [{ provider_id: "pp_bank-transfer_bank-transfer" }],
          },
        ],
      },
    ])

    await run(container)

    expect(bankAccountService.listBankAccounts).not.toHaveBeenCalled()
    expect(createNotifications.mock.calls[0][0].data).not.toHaveProperty("bank_transfer")
  })

  it("logs the error and does not throw when the account list fails", async () => {
    const { container, logger, bankAccountService } = makeContainer([bankTransferOrder])
    bankAccountService.listBankAccounts.mockRejectedValue(new Error("Database is down"))

    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The order-placed email for order order_123 failed. Cause: Database is down"
    )
  })

  it("removes a trailing slash from the storefront URL", async () => {
    const { container, createNotifications } = makeContainer([order], "https://shop.example.com/")
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.order_url).toBe(
      "https://shop.example.com/id/orders/order_123"
    )
  })

  it("passes the locale, the store, and the Indonesian link", async () => {
    const { container, createNotifications } = makeContainer([bankTransferOrder])
    await run(container)
    const call = createNotifications.mock.calls[0][0]
    expect(call.template).toBe("order-placed")
    expect(call.data.locale).toBe("id-ID")
    expect(call.data.store).toEqual({
      name: "Everyday",
      contact_email: "hello@everyday.id",
      whatsapp: null,
    })
    expect(call.data.order_url).toBe("https://shop.example.com/id/orders/order_123")
    expect(call.data.order.shipping_method).toBe("JNE Regular")
    expect(call.data.bank_transfer.deadline).toBe("18 Oktober 2026, 14.30 WIB")
  })

  it("uses English and no prefix for an order with no locale", async () => {
    const { container, createNotifications } = makeContainer([{ ...order, locale: null }])
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect(data.locale).toBe("en-US")
    expect(data.order_url).toBe("https://shop.example.com/orders/order_123")
  })

  it("uses the product title for the line and falls back to the item title", async () => {
    const { container, createNotifications } = makeContainer([
      {
        ...order,
        items: [
          { title: "M", product_title: "Plain T-Shirt", quantity: 1, unit_price: 1 },
          { title: "Mug", product_title: null, quantity: 1, unit_price: 1 },
        ],
      },
    ])
    await run(container)
    const titles = createNotifications.mock.calls[0][0].data.order.items.map(
      (item: { title: string }) => item.title
    )
    expect(titles).toEqual(["Plain T-Shirt", "Mug"])
  })

  // The owner alert needs no storefront link, so only the customer email stops.
  it("warns and sends only the owner alert without STOREFRONT_URL", async () => {
    const { container, createNotifications, logger } = makeContainer([order], "")
    await run(container)
    expect(sentTemplates(createNotifications)).toEqual(["new-order-owner"])
    expect(logger.warn).toHaveBeenCalledWith(
      "The order-placed email was not sent. STOREFRONT_URL has no value."
    )
  })

  // Review Focus: an order with no email address.
  it("skips the customer send and logs a warning when the order has no email", async () => {
    const { container, createNotifications, logger } = makeContainer([{ ...order, email: null }])
    await run(container)
    expect(sentTemplates(createNotifications)).toEqual(["new-order-owner"])
    expect(createNotifications.mock.calls[0][0].data.order.email).toBe("")
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
    createNotifications.mockRejectedValue(new Error("SMTP is down"))

    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The order-placed email for order order_123 failed. Cause: SMTP is down"
    )
  })

  // Review Focus: the owner email send fails after the customer email.
  describe("the new-order-owner alert", () => {
    const ownerEmail = process.env.STORE_OWNER_EMAIL

    afterEach(() => {
      if (ownerEmail === undefined) {
        delete process.env.STORE_OWNER_EMAIL
      } else {
        process.env.STORE_OWNER_EMAIL = ownerEmail
      }
    })

    it("sends the owner alert after the customer email", async () => {
      const { container, createNotifications } = makeContainer([bankTransferOrder])

      await run(container)

      expect(sentTemplates(createNotifications)).toEqual(["order-placed", "new-order-owner"])
      expect(createNotifications.mock.calls[1][0]).toEqual({
        to: "hello@everyday.id",
        channel: "email",
        template: "new-order-owner",
        data: {
          store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
          admin_url: "http://localhost:9000/app/orders/order_123",
          payment: { label: "Bank transfer, waiting for the receipt", waiting_for_receipt: true },
          order: {
            display_id: 42,
            created_at: "2026-10-17T07:30:00.000Z",
            email: "buyer@example.com",
            customer_name: "Budi Santoso",
            total: 318000,
            shipping_total: 20000,
            shipping_method: "JNE Regular",
            items: [
              { title: "Plain T-Shirt", variant_title: "M", quantity: 2, unit_price: 150000 },
            ],
            shipping_address: order.shipping_address,
          },
        },
      })
    })

    it("labels a captured bank transfer order as paid", async () => {
      const { container, createNotifications } = makeContainer([
        {
          ...bankTransferOrder,
          payment_collections: [
            {
              status: "completed",
              payment_sessions: [{ provider_id: "pp_bank-transfer_bank-transfer" }],
            },
          ],
        },
      ])

      await run(container)

      expect(createNotifications.mock.calls[1][0].data.payment).toEqual({
        label: "Bank transfer",
        waiting_for_receipt: false,
      })
    })

    it("labels a gateway order as an online payment", async () => {
      const { container, createNotifications } = makeContainer([
        {
          ...order,
          payment_collections: [
            { status: "authorized", payment_sessions: [{ provider_id: "pp_test_test" }] },
          ],
        },
      ])

      await run(container)

      expect(createNotifications.mock.calls[1][0].data.payment).toEqual({
        label: "Online payment",
        waiting_for_receipt: false,
      })
    })

    it("gives no customer name when the address has no name", async () => {
      const { container, createNotifications } = makeContainer([
        { ...order, shipping_address: { first_name: " ", last_name: null, city: "Jakarta" } },
      ])

      await run(container)

      expect(createNotifications.mock.calls[1][0].data.order.customer_name).toBeNull()
    })

    it("uses the admin backend URL and path of the config", async () => {
      const { container, createNotifications } = makeContainer([order])
      const config = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
      config.admin.backendUrl = "https://api.example.com/"
      config.admin.path = "/dashboard"

      await run(container)

      expect(createNotifications.mock.calls[1][0].data.admin_url).toBe(
        "https://api.example.com/dashboard/orders/order_123"
      )
    })

    it("logs a failed owner send once and keeps the customer send", async () => {
      const { container, createNotifications, logger } = makeContainer([order])
      createNotifications.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("boom"))

      await expect(run(container)).resolves.toBeUndefined()

      expect(sentTemplates(createNotifications)).toEqual(["order-placed", "new-order-owner"])
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(
        "The new-order-owner email for order order_123 failed. Cause: boom"
      )
    })

    it("sends the owner alert when the customer send fails", async () => {
      const { container, createNotifications, logger } = makeContainer([order])
      createNotifications.mockRejectedValueOnce(new Error("SMTP is down"))

      await run(container)

      expect(sentTemplates(createNotifications)).toEqual(["order-placed", "new-order-owner"])
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith(
        "The order-placed email for order order_123 failed. Cause: SMTP is down"
      )
    })

    it("warns and skips the owner alert when the owner address is empty", async () => {
      process.env.STORE_OWNER_EMAIL = ""
      const { container, createNotifications, logger, bankAccountService } = makeContainer([order])
      bankAccountService.getContact.mockResolvedValue({ email: null, whatsapp: null })

      await run(container)

      expect(sentTemplates(createNotifications)).toEqual(["order-placed"])
      expect(logger.warn).toHaveBeenCalledWith(
        "The owner email is empty. The new-order-owner email for order #42 was not sent. Set the store contact email or STORE_OWNER_EMAIL."
      )
    })

    it("logs the error and sends nothing when the order query fails", async () => {
      const { container, graph, createNotifications, logger } = makeContainer([order])
      graph.mockRejectedValue(new Error("Database is down"))

      await expect(run(container)).resolves.toBeUndefined()

      expect(createNotifications).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        "The order-placed and new-order-owner emails for order order_123 were not sent. Cause: Database is down"
      )
    })
  })
})
