import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readPaymentWithOrder } from "../../lib/payment-order"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import paymentCapturedHandler, { config } from "../payment-captured"

jest.mock("../../lib/payment-order", () => ({ readPaymentWithOrder: jest.fn() }))

const readPayment = readPaymentWithOrder as jest.MockedFunction<typeof readPaymentWithOrder>

const payment = {
  id: "pay_1",
  provider_id: "pp_bank-transfer_bank-transfer",
  amount: 645000,
  captured_at: "2026-10-21T03:05:00.000Z",
  refunds: [],
}

const order = {
  id: "order_1",
  display_id: 24117,
  email: "sari@example.com",
  locale: "en-US",
  status: "pending",
  created_at: "2026-10-20T07:30:00.000Z",
  total: 645000,
  shipping_total: 20000,
  shipping_methods: [{ name: "JNE Regular" }],
  items: [
    {
      product_title: "Relaxed Linen Shirt",
      title: "Sand / M",
      variant_title: "Sand / M",
      quantity: 1,
      unit_price: 625000,
    },
  ],
  shipping_address: { first_name: "Sari", city: "Jakarta Selatan" },
}

const makeContainer = (storefrontUrl = "https://shop.example.com") => {
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
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
  return { container, createNotifications, logger }
}

const run = (container: any) =>
  paymentCapturedHandler({
    event: { name: "payment.captured", data: { id: "pay_1" } },
    container,
    pluginOptions: {},
  } as any)

describe("payment-captured subscriber", () => {
  beforeEach(() => {
    readPayment.mockReset()
  })

  it("listens to payment.captured", () => {
    expect(config.event).toBe("payment.captured")
  })

  it("sends the confirmation for a bank transfer payment", async () => {
    readPayment.mockResolvedValue({ payment, order })
    const { container, createNotifications } = makeContainer()
    await run(container)
    expect(readPayment).toHaveBeenCalledWith(container, "pay_1")
    expect(createNotifications).toHaveBeenCalledWith({
      to: "sari@example.com",
      channel: "email",
      template: "payment-confirmed",
      data: {
        locale: "en-US",
        store: {
          name: "Everyday",
          contact_email: "hello@everyday.id",
          whatsapp: null,
          phone: null,
        },
        order_url: "https://shop.example.com/orders/order_1",
        payment: {
          amount: 645000,
          captured_at: "2026-10-21T03:05:00.000Z",
          method: "bank_transfer",
        },
        order: {
          display_id: 24117,
          created_at: "2026-10-20T07:30:00.000Z",
          first_name: "Sari",
          total: 645000,
          shipping_total: 20000,
          shipping_method: "JNE Regular",
          items: [
            {
              title: "Relaxed Linen Shirt",
              variant_title: "Sand / M",
              quantity: 1,
              unit_price: 625000,
            },
          ],
        },
      },
    })
  })

  it("uses the Indonesian link for an Indonesian order", async () => {
    readPayment.mockResolvedValue({ payment, order: { ...order, locale: "id-ID" } })
    const { container, createNotifications } = makeContainer()
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect([data.locale, data.order_url]).toEqual([
      "id-ID",
      "https://shop.example.com/id/orders/order_1",
    ])
  })

  it("uses the time now when the payment has no captured_at", async () => {
    readPayment.mockResolvedValue({ payment: { ...payment, captured_at: null }, order })
    const { container, createNotifications } = makeContainer()
    const before = Date.now()
    await run(container)
    const capturedAt = Date.parse(createNotifications.mock.calls[0][0].data.payment.captured_at)
    expect(capturedAt).toBeGreaterThanOrEqual(before)
    expect(capturedAt).toBeLessThanOrEqual(Date.now())
  })

  it("gives a null first name when the order has no shipping address", async () => {
    readPayment.mockResolvedValue({ payment, order: { ...order, shipping_address: null } })
    const { container, createNotifications } = makeContainer()
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.order.first_name).toBeNull()
  })

  it("sends nothing for a provider outside the list", async () => {
    readPayment.mockResolvedValue({
      payment: { ...payment, provider_id: "pp_midtrans_midtrans" },
      order,
    })
    const { container, createNotifications, logger } = makeContainer()
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("warns when the payment has no order", async () => {
    readPayment.mockResolvedValue(null)
    const { container, createNotifications, logger } = makeContainer()
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The payment-confirmed email was not sent. Payment pay_1 has no order."
    )
  })

  it("warns and sends nothing for an order with no email", async () => {
    readPayment.mockResolvedValue({ payment, order: { ...order, email: null } })
    const { container, createNotifications, logger } = makeContainer()
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The payment-confirmed email was not sent. Order order_1 has no email address."
    )
  })

  it("warns and sends nothing without STOREFRONT_URL", async () => {
    readPayment.mockResolvedValue({ payment, order })
    const { container, createNotifications, logger } = makeContainer("")
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The payment-confirmed email was not sent. STOREFRONT_URL has no value."
    )
  })

  it("logs a send error and does not throw", async () => {
    readPayment.mockResolvedValue({ payment, order })
    const { container, createNotifications, logger } = makeContainer()
    createNotifications.mockRejectedValue(new Error("SMTP is down"))
    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The payment-confirmed email for payment pay_1 failed. Cause: SMTP is down"
    )
  })

  it("logs a read error and does not throw", async () => {
    readPayment.mockRejectedValue(new Error("Database is down"))
    const { container, logger } = makeContainer()
    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The payment-confirmed email for payment pay_1 failed. Cause: Database is down"
    )
  })
})
