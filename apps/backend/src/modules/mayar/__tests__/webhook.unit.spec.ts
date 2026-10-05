import { makeService } from "./helpers"

const body = {
  event: "payment.received",
  data: {
    id: "trx_1",
    status: "SUCCESS",
    transactionStatus: "paid",
    amount: 95000,
    productId: "inv_1",
    productType: "invoice",
    customerEmail: "buyer@example.com",
  },
}
const payload = (data: unknown) => ({ data, rawData: JSON.stringify(data), headers: {} }) as any
const paidInvoice = {
  id: "inv_1",
  status: "paid",
  amount: 95000,
  transactions: [{ id: "trx_1", extraData: { session_id: "payses_1" } }],
}

describe("MayarPaymentProviderService: getWebhookActionAndData", () => {
  it("returns the captured action for an invoice that Mayar reports as paid", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue(paidInvoice)

    const result = await service.getWebhookActionAndData(payload(body))

    expect(client.getInvoice).toHaveBeenCalledWith("inv_1")
    expect(result).toEqual({ action: "captured", data: { session_id: "payses_1", amount: 95000 } })
  })

  it("reads the session id from the top-level extra data", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue({
      id: "inv_1",
      status: "paid",
      amount: "95000",
      extraData: { session_id: "payses_1" },
    })

    expect(await service.getWebhookActionAndData(payload(body))).toEqual({
      action: "captured",
      data: { session_id: "payses_1", amount: 95000 },
    })
  })

  it("returns the same answer when the webhook arrives two times", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue(paidInvoice)

    const first = await service.getWebhookActionAndData(payload(body))
    const second = await service.getWebhookActionAndData(payload(body))

    expect(second).toEqual(first)
  })

  // Review Focus: a forged payload, an unknown event, and a body with no invoice id.
  it("does not return captured when the Mayar API reports the invoice as not paid", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue({ ...paidInvoice, status: "unpaid" })

    expect(await service.getWebhookActionAndData(payload(body))).toEqual({
      action: "not_supported",
    })
  })

  it("ignores each event that is not payment.received", async () => {
    const { service, client } = makeService()

    expect(
      await service.getWebhookActionAndData(payload({ ...body, event: "payment.reminder" }))
    ).toEqual({ action: "not_supported" })
    expect(client.getInvoice).not.toHaveBeenCalled()
  })

  it.each([
    ["no body", undefined],
    ["a body that is a string", "payment.received"],
    ["no data", { event: "payment.received" }],
    ["no productId", { event: "payment.received", data: { id: "trx_1" } }],
    ["a productId that is not a string", { event: "payment.received", data: { productId: 5 } }],
  ])("ignores a webhook with %s", async (_name, data) => {
    const { service, client } = makeService()

    expect(await service.getWebhookActionAndData(payload(data))).toEqual({
      action: "not_supported",
    })
    expect(client.getInvoice).not.toHaveBeenCalled()
  })

  it("logs a warning when the paid invoice has no session id", async () => {
    const { service, client, logger } = makeService()
    client.getInvoice.mockResolvedValue({ id: "inv_1", status: "paid", amount: 95000 })

    expect(await service.getWebhookActionAndData(payload(body))).toEqual({
      action: "not_supported",
    })
    expect(logger.warn).toHaveBeenCalledWith(
      "The paid Mayar invoice inv_1 has no session id. The check-paid-carts job completes the cart."
    )
  })

  it("logs an error and does not throw when the Mayar API fails", async () => {
    const { service, client, logger } = makeService()
    client.getInvoice.mockRejectedValue(new Error("The Mayar request failed."))

    expect(await service.getWebhookActionAndData(payload(body))).toEqual({
      action: "not_supported",
    })
    expect(logger.error).toHaveBeenCalledWith(
      "The Mayar webhook for the invoice inv_1 was not confirmed. Cause: The Mayar request failed."
    )
  })
})
