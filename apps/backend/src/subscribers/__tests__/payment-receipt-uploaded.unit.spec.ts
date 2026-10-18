import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PAYMENT_RECEIPT_MODULE } from "../../modules/payment-receipt"
import { PAYMENT_RECEIPT_UPLOADED } from "../../modules/payment-receipt/constants"
import paymentReceiptUploadedHandler, { config } from "../payment-receipt-uploaded"

const makeContainer = (backendUrl = "https://api.example.com/") => {
  const graph = jest.fn().mockResolvedValue({ data: [{ id: "order_1", display_id: 12 }] })
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
      fields: ["id", "display_id"],
      filters: { id: "order_1" },
    })
    expect(receiptService.listPaymentReceipts).toHaveBeenCalledWith({ id: "prcpt_1" })
    expect(receiptService.countReceipts).toHaveBeenCalledWith("order_1")
    expect(createNotifications).toHaveBeenCalledWith({
      to: "owner@example.com",
      channel: "email",
      template: "receipt-uploaded",
      data: {
        order: { display_id: 12 },
        file_name: "bukti.png",
        receipt_count: 1,
        admin_url: "https://api.example.com/app/orders/order_1",
      },
    })
  })

  it("uses the local backend URL when backendUrl is the Medusa default", async () => {
    const { container, createNotifications } = makeContainer("/")

    await run(container)

    expect(createNotifications.mock.calls[0][0].data.admin_url).toBe(
      "http://localhost:9000/app/orders/order_1"
    )
  })

  it("sends nothing and logs a warning when STORE_OWNER_EMAIL is empty", async () => {
    process.env.STORE_OWNER_EMAIL = ""
    const { container, createNotifications, logger } = makeContainer()

    await run(container)

    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "STORE_OWNER_EMAIL is empty. The receipt email for order #12 was not sent."
    )
  })

  it("logs the error and does not throw when the send fails", async () => {
    const { container, createNotifications, logger } = makeContainer()
    createNotifications.mockRejectedValue(new Error("Brevo is down"))

    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The receipt-uploaded email for order order_1 failed. Cause: Brevo is down"
    )
  })
})
