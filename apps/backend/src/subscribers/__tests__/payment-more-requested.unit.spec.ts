import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import { PAYMENT_RECEIPT_MODULE } from "../../modules/payment-receipt"
import { PAYMENT_MORE_REQUESTED } from "../../modules/payment-receipt/constants"
import paymentMoreRequestedHandler, { config } from "../payment-more-requested"

const order = {
  id: "order_1",
  display_id: 12,
  email: "sari@example.com",
  locale: "id-ID",
  shipping_address: { first_name: "Sari" },
}

const makeContainer = (
  orders: unknown[] = [order],
  storefrontUrl = "https://shop.example.com/"
) => {
  const graph = jest.fn().mockResolvedValue({ data: orders })
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const receiptService = {
    listPaymentNotes: jest
      .fn()
      .mockResolvedValue([{ id: "pnote_1", note: "Rp 50.000 is missing.\nSend it today." }]),
  }
  const bankAccountService = {
    listBankAccounts: jest.fn().mockResolvedValue([
      {
        id: "ba_1",
        bank_name: "BCA",
        account_number: "0123456789",
        account_holder: "Toko",
        is_active: true,
      },
    ]),
    getContact: jest.fn().mockResolvedValue({ email: "hello@everyday.id", whatsapp: null }),
  }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.NOTIFICATION]: { createNotifications },
    [PAYMENT_RECEIPT_MODULE]: receiptService,
    [BANK_ACCOUNT_MODULE]: bankAccountService,
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, graph, createNotifications, logger, receiptService }
}

const run = (container: any) =>
  paymentMoreRequestedHandler({
    event: { name: PAYMENT_MORE_REQUESTED, data: { order_id: "order_1", note_id: "pnote_1" } },
    container,
    pluginOptions: {},
  } as any)

describe("payment-more-requested subscriber", () => {
  it("listens to the ask for more event", () => {
    expect(config.event).toBe(PAYMENT_MORE_REQUESTED)
  })

  it("sends the more-payment-needed email to the order email", async () => {
    const { container, graph, createNotifications, receiptService } = makeContainer()

    await run(container)

    expect(graph).toHaveBeenCalledWith({
      entity: "order",
      fields: ["id", "display_id", "email", "locale", "shipping_address.first_name"],
      filters: { id: "order_1" },
    })
    expect(receiptService.listPaymentNotes).toHaveBeenCalledWith({
      id: "pnote_1",
      order_id: "order_1",
    })
    expect(createNotifications).toHaveBeenCalledWith({
      to: "sari@example.com",
      channel: "email",
      template: "more-payment-needed",
      data: {
        locale: "id-ID",
        store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
        order: { display_id: 12, first_name: "Sari" },
        note: "Rp 50.000 is missing.\nSend it today.",
        order_url: "https://shop.example.com/id/orders/order_1",
        accounts: [{ bank_name: "BCA", account_number: "0123456789", account_holder: "Toko" }],
      },
    })
  })

  it("passes the locale, the store, the link, and the accounts", async () => {
    const { container, createNotifications } = makeContainer([{ ...order, locale: "en-US" }])
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect(data.locale).toBe("en-US")
    expect(data.order_url).toBe("https://shop.example.com/orders/order_1")
    expect(data.accounts).toEqual([
      { bank_name: "BCA", account_number: "0123456789", account_holder: "Toko" },
    ])
  })

  it("warns and sends nothing without STOREFRONT_URL", async () => {
    const { container, createNotifications, logger } = makeContainer([order], "")
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The more-payment-needed email was not sent. STOREFRONT_URL has no value."
    )
  })

  it("sends a null first name when the order has no shipping address", async () => {
    const { container, createNotifications } = makeContainer([{ ...order, shipping_address: null }])

    await run(container)

    expect(createNotifications.mock.calls[0][0].data.order.first_name).toBeNull()
  })

  it("sends nothing and logs a warning when the order has no email", async () => {
    const { container, createNotifications, logger } = makeContainer([{ ...order, email: null }])

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The more-payment-needed email was not sent. Order order_1 has no email address."
    )
  })

  it("logs the error and does not throw when the send fails", async () => {
    const { container, createNotifications, logger } = makeContainer()
    createNotifications.mockRejectedValue(new Error("Brevo is down"))

    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The more-payment-needed email for order order_1 failed. Cause: Brevo is down"
    )
  })
})
