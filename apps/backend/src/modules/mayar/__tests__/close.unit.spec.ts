import { makeService, sessionData } from "./helpers"

describe.each(["cancelPayment", "deletePayment"] as const)(
  "MayarPaymentProviderService: %s",
  (method) => {
    it("closes the invoice and returns the data", async () => {
      const { service, client } = makeService()
      client.closeInvoice.mockResolvedValue(undefined)

      const output = await service[method]({ data: sessionData } as any)

      expect(client.closeInvoice).toHaveBeenCalledWith("inv_1")
      expect(output).toEqual({ data: sessionData })
    })

    it("logs a warning and continues when the close fails", async () => {
      const { service, client, logger } = makeService()
      client.closeInvoice.mockRejectedValue(new Error("The Mayar request failed."))

      const output = await service[method]({ data: sessionData } as any)

      expect(output).toEqual({ data: sessionData })
      expect(logger.warn).toHaveBeenCalledWith(
        "Mayar did not close the invoice inv_1. Cause: The Mayar request failed."
      )
    })

    it("does not call Mayar when the session has no invoice id", async () => {
      const { service, client } = makeService()
      await service[method]({ data: {} } as any)
      expect(client.closeInvoice).not.toHaveBeenCalled()
    })
  }
)

describe("MayarPaymentProviderService: updatePayment", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T00:00:00.000Z"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("closes the old invoice and creates a new one for the new amount", async () => {
    const { service, client } = makeService()
    client.closeInvoice.mockResolvedValue(undefined)
    client.createInvoice.mockResolvedValue({
      id: "inv_2",
      link: "https://store.myr.id/invoices/def",
    })

    const output = await service.updatePayment({
      amount: 180000,
      currency_code: "idr",
      data: sessionData,
      context: {},
    } as any)

    expect(client.closeInvoice).toHaveBeenCalledWith("inv_1")
    expect(client.createInvoice).toHaveBeenCalledTimes(1)
    expect(client.createInvoice.mock.calls[0][0]).toMatchObject({
      name: "Budi Santoso",
      email: "buyer@example.com",
      mobile: "081234567890",
      items: [{ quantity: 1, rate: 180000, description: "Order payment" }],
      extraData: { session_id: "payses_1" },
    })
    expect(output).toEqual({
      data: {
        ...sessionData,
        invoice_id: "inv_2",
        payment_url: "https://store.myr.id/invoices/def",
        expired_at: "2026-10-03T00:00:00.000Z",
        amount: 180000,
      },
    })
  })

  it("creates the new invoice also when the close fails", async () => {
    const { service, client } = makeService()
    client.closeInvoice.mockRejectedValue(new Error("The Mayar request failed."))
    client.createInvoice.mockResolvedValue({
      id: "inv_2",
      link: "https://store.myr.id/invoices/def",
    })

    const output = await service.updatePayment({
      amount: 180000,
      currency_code: "idr",
      data: sessionData,
      context: {},
    } as any)

    expect((output.data as any).invoice_id).toBe("inv_2")
  })
})

describe("MayarPaymentProviderService: refundPayment", () => {
  it("records the refund in Medusa only", async () => {
    const { service, client, logger } = makeService()

    const output = await service.refundPayment({ amount: 95000, data: sessionData } as any)

    expect(output).toEqual({ data: sessionData })
    expect(client.getInvoice).not.toHaveBeenCalled()
    expect(client.closeInvoice).not.toHaveBeenCalled()
    expect(client.createInvoice).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      "Medusa recorded a refund of 95000 for the Mayar invoice inv_1. Mayar has no refund API. Return the money in the Mayar dashboard."
    )
  })
})
