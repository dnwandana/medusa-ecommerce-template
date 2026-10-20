import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readPaymentWithOrder } from "../../lib/payment-order"
import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import paymentRefundedHandler, { config } from "../payment-refunded"

jest.mock("../../lib/payment-order", () => ({ readPaymentWithOrder: jest.fn() }))

const readPayment = readPaymentWithOrder as jest.MockedFunction<typeof readPaymentWithOrder>

const refund = {
  id: "ref_1",
  amount: 645000,
  created_at: "2026-10-22T00:00:00.000Z",
  note: null,
  refund_reason: null,
}

const payment = {
  id: "pay_1",
  provider_id: "pp_bank-transfer_bank-transfer",
  amount: 645000,
  captured_at: "2026-10-21T03:05:00.000Z",
  refunds: [refund],
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
  items: [],
  shipping_address: { first_name: "Sari" },
}

const makeContainer = (storefrontUrl = "https://shop.example.com") => {
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { storefrontUrl } },
    [Modules.NOTIFICATION]: { createNotifications },
    [BANK_ACCOUNT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({ email: "hello@everyday.id", whatsapp: null }),
    },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, createNotifications, logger }
}

const run = (container: any) =>
  paymentRefundedHandler({
    event: { name: "payment.refunded", data: { id: "pay_1" } },
    container,
    pluginOptions: {},
  } as any)

describe("payment-refunded subscriber", () => {
  beforeEach(() => {
    readPayment.mockReset()
  })

  it("listens to payment.refunded", () => {
    expect(config.event).toBe("payment.refunded")
  })

  it("sends the refund-sent email", async () => {
    readPayment.mockResolvedValue({ payment, order })
    const { container, createNotifications } = makeContainer()
    await run(container)
    expect(readPayment).toHaveBeenCalledWith(container, "pay_1")
    expect(createNotifications).toHaveBeenCalledWith({
      to: "sari@example.com",
      channel: "email",
      template: "refund-sent",
      data: {
        locale: "en-US",
        store: { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null },
        order_url: "https://shop.example.com/orders/order_1",
        refund: {
          amount: 645000,
          created_at: "2026-10-22T00:00:00.000Z",
          reason: null,
          note: null,
          method: "bank_transfer",
        },
        order: { display_id: 24117, created_at: "2026-10-20T07:30:00.000Z" },
      },
    })
  })

  it("sends the newest refund", async () => {
    readPayment.mockResolvedValue({
      payment: {
        ...payment,
        refunds: [
          {
            id: "r2",
            amount: 645000,
            created_at: "2026-10-22T00:00:00.000Z",
            note: "BCA",
            refund_reason: { label: "Damaged" },
          },
          {
            id: "r1",
            amount: 1,
            created_at: "2026-10-21T00:00:00.000Z",
            note: null,
            refund_reason: null,
          },
        ],
      },
      order: { ...order, status: "pending" },
    })
    const { container, createNotifications } = makeContainer()
    await run(container)
    const { data } = createNotifications.mock.calls[0][0]
    expect(data.refund).toEqual({
      amount: 645000,
      created_at: "2026-10-22T00:00:00.000Z",
      reason: "Damaged",
      note: "BCA",
      method: "bank_transfer",
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

  it("skips a bank transfer refund of a cancelled order", async () => {
    readPayment.mockResolvedValue({ payment, order: { ...order, status: "canceled" } })
    const { container, createNotifications, logger } = makeContainer()
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("sends a gateway refund of a cancelled order", async () => {
    readPayment.mockResolvedValue({
      payment: { ...payment, provider_id: "pp_midtrans_midtrans" },
      order: { ...order, status: "canceled" },
    })
    const { container, createNotifications } = makeContainer()
    await run(container)
    expect(createNotifications.mock.calls[0][0].data.refund.method).toBe("other")
  })

  it("warns when the payment has no order", async () => {
    readPayment.mockResolvedValue(null)
    const { container, createNotifications, logger } = makeContainer()
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The refund-sent email was not sent. Payment pay_1 has no order."
    )
  })

  it("warns without a refund", async () => {
    readPayment.mockResolvedValue({ payment: { ...payment, refunds: [] }, order })
    const { container, createNotifications, logger } = makeContainer()
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The refund-sent email was not sent. Payment pay_1 has no refund."
    )
  })

  it("warns and sends nothing for an order with no email", async () => {
    readPayment.mockResolvedValue({ payment, order: { ...order, email: null } })
    const { container, createNotifications, logger } = makeContainer()
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The refund-sent email was not sent. Order order_1 has no email address."
    )
  })

  it("warns and sends nothing without STOREFRONT_URL", async () => {
    readPayment.mockResolvedValue({ payment, order })
    const { container, createNotifications, logger } = makeContainer("")
    await run(container)
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The refund-sent email was not sent. STOREFRONT_URL has no value."
    )
  })

  it("logs a send error and does not throw", async () => {
    readPayment.mockResolvedValue({ payment, order })
    const { container, createNotifications, logger } = makeContainer()
    createNotifications.mockRejectedValue(new Error("SMTP is down"))
    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The refund-sent email for payment pay_1 failed. Cause: SMTP is down"
    )
  })
})
