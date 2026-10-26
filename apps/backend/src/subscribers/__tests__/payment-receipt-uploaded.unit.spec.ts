import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PAYMENT_RECEIPT_MODULE } from "../../modules/payment-receipt"
import { PAYMENT_RECEIPT_UPLOADED } from "../../modules/payment-receipt/constants"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import paymentReceiptUploadedHandler, { config } from "../payment-receipt-uploaded"

type ContainerOptions = {
  backendUrl?: string
  contactEmail?: string | null
}

const makeContainer = ({
  backendUrl = "https://api.example.com/",
  contactEmail = null,
}: ContainerOptions = {}) => {
  const graph = jest
    .fn()
    .mockResolvedValue({ data: [{ id: "order_1", display_id: 12, total: 318000 }] })
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const receiptService = {
    listPaymentReceipts: jest.fn().mockResolvedValue([{ id: "prcpt_1", file_name: "bukti.png" }]),
    countReceipts: jest.fn().mockResolvedValue(1),
  }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin: { backendUrl } },
    [Modules.NOTIFICATION]: { createNotifications },
    [PAYMENT_RECEIPT_MODULE]: receiptService,
    [STOREFRONT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({
        email: contactEmail,
        phone: null,
        whatsapp: null,
        address: null,
        social_links: [],
      }),
    },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, graph, createNotifications, logger, receiptService }
}

const run = (container: any) =>
  paymentReceiptUploadedHandler({
    event: { name: PAYMENT_RECEIPT_UPLOADED, data: { id: "prcpt_1", order_id: "order_1" } },
    container,
    pluginOptions: {},
  } as any)

describe("payment-receipt-uploaded subscriber", () => {
  const ownerEmail = process.env.STORE_OWNER_EMAIL

  beforeEach(() => {
    process.env.STORE_OWNER_EMAIL = "owner@example.com"
  })

  afterAll(() => {
    if (ownerEmail === undefined) {
      delete process.env.STORE_OWNER_EMAIL
    } else {
      process.env.STORE_OWNER_EMAIL = ownerEmail
    }
  })

  it("listens to the receipt upload event", () => {
    expect(config.event).toBe(PAYMENT_RECEIPT_UPLOADED)
  })

  it("sends the receipt-uploaded email to the store owner", async () => {
    const { container, graph, createNotifications, receiptService } = makeContainer()

    await run(container)

    expect(graph).toHaveBeenCalledWith({
      entity: "order",
      fields: ["id", "display_id", "total"],
      filters: { id: "order_1" },
    })
    expect(receiptService.listPaymentReceipts).toHaveBeenCalledWith({ id: "prcpt_1" })
    expect(receiptService.countReceipts).toHaveBeenCalledWith("order_1")
    expect(createNotifications).toHaveBeenCalledWith({
      to: "owner@example.com",
      channel: "email",
      template: "receipt-uploaded",
      data: {
        store: { name: "Everyday", contact_email: null, whatsapp: null, phone: null },
        order: { display_id: 12 },
        file_name: "bukti.png",
        receipt_count: 1,
        amount_due: 318000,
        admin_url: "https://api.example.com/app/orders/order_1",
      },
    })
  })

  it("uses the local backend URL when backendUrl is the Medusa default", async () => {
    const { container, createNotifications } = makeContainer({ backendUrl: "/" })

    await run(container)

    expect(createNotifications.mock.calls[0][0].data.admin_url).toBe(
      "http://localhost:9000/app/orders/order_1"
    )
  })

  it("sends to the store contact email with the amount due", async () => {
    const { container, createNotifications } = makeContainer({ contactEmail: "owner@everyday.id" })

    await run(container)

    const call = createNotifications.mock.calls[0][0]
    expect(call.to).toBe("owner@everyday.id")
    expect(call.data.amount_due).toBe(318000)
    expect(call.data.store.name).toBe("Everyday")
  })

  it("falls back to STORE_OWNER_EMAIL when the store has no contact email", async () => {
    const { container, createNotifications } = makeContainer({ contactEmail: null })

    await run(container)

    expect(createNotifications.mock.calls[0][0].to).toBe("owner@example.com")
  })

  it("sends nothing and logs a warning when both addresses are empty", async () => {
    process.env.STORE_OWNER_EMAIL = ""
    const { container, createNotifications, logger } = makeContainer({ contactEmail: null })

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "The owner email is empty. The receipt email for order #12 was not sent. Set the store contact email or STORE_OWNER_EMAIL."
    )
  })

  it("logs the error and does not throw when the send fails", async () => {
    const { container, createNotifications, logger } = makeContainer()
    createNotifications.mockRejectedValue(new Error("SMTP is down"))

    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The receipt-uploaded email for order order_1 failed. Cause: SMTP is down"
    )
  })
})
