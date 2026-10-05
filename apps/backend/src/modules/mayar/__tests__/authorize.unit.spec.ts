import { makeService, sessionData } from "./helpers"

const input = { data: sessionData, context: {} } as any
const invoice = (status: string, amount: number | string = 95000) => ({
  id: "inv_1",
  status,
  amount,
})

describe("MayarPaymentProviderService: authorizePayment", () => {
  it("reports captured for a paid invoice with the session amount", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue(invoice("paid"))

    const output = await service.authorizePayment(input)

    expect(client.getInvoice).toHaveBeenCalledWith("inv_1")
    expect(output).toEqual({ status: "captured", data: sessionData })
  })

  // Medusa returns the cart with status 200 only for this error type. The storefront then tries
  // the completion again.
  const notConfirmed = {
    type: "payment_authorization_error",
    message: "The payment for the Mayar invoice inv_1 is not confirmed.",
  }

  it("stops with a payment authorization error for an invoice that is not paid", async () => {
    const { service, client, logger } = makeService()
    client.getInvoice.mockResolvedValue(invoice("unpaid"))

    await expect(service.authorizePayment(input)).rejects.toMatchObject(notConfirmed)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("stops with a payment authorization error for an expired and a closed invoice", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue(invoice("expired"))
    await expect(service.authorizePayment(input)).rejects.toMatchObject(notConfirmed)
    client.getInvoice.mockResolvedValue(invoice("closed"))
    await expect(service.authorizePayment(input)).rejects.toMatchObject(notConfirmed)
  })

  it("stops with a payment authorization error and logs an error for an amount mismatch", async () => {
    const { service, client, logger } = makeService()
    client.getInvoice.mockResolvedValue(invoice("paid", 1))

    await expect(service.authorizePayment(input)).rejects.toMatchObject(notConfirmed)
    expect(logger.error).toHaveBeenCalledWith(
      "The Mayar invoice inv_1 is paid with the amount 1, but the payment session payses_1 expects 95000."
    )
  })

  it("stops when the session has no invoice id", async () => {
    const { service, client } = makeService()
    await expect(service.authorizePayment({ data: {}, context: {} } as any)).rejects.toThrow(
      "The payment session has no Mayar invoice id."
    )
    expect(client.getInvoice).not.toHaveBeenCalled()
  })

  it("lets an error of the Mayar API pass through", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockRejectedValue(new Error("The Mayar request failed."))
    await expect(service.authorizePayment(input)).rejects.toThrow("The Mayar request failed.")
  })
})

describe("MayarPaymentProviderService: getPaymentStatus", () => {
  it("maps the invoice in the same way as authorizePayment", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue(invoice("paid"))
    expect(await service.getPaymentStatus({ data: sessionData } as any)).toMatchObject({
      status: "captured",
    })
    client.getInvoice.mockResolvedValue(invoice("unpaid"))
    expect(await service.getPaymentStatus({ data: sessionData } as any)).toMatchObject({
      status: "pending",
    })
    client.getInvoice.mockResolvedValue(invoice("paid", 1))
    expect(await service.getPaymentStatus({ data: sessionData } as any)).toMatchObject({
      status: "pending",
    })
  })
})

describe("MayarPaymentProviderService: retrievePayment", () => {
  it("returns the session data with the status of the invoice", async () => {
    const { service, client } = makeService()
    client.getInvoice.mockResolvedValue(invoice("unpaid"))

    const output = await service.retrievePayment({ data: sessionData } as any)

    expect(client.getInvoice).toHaveBeenCalledWith("inv_1")
    expect(output).toEqual({ data: { ...sessionData, mayar_status: "unpaid" } })
  })
})

describe("MayarPaymentProviderService: capturePayment", () => {
  it("returns the data and does not call Mayar", async () => {
    const { service, client } = makeService()

    expect(await service.capturePayment({ data: sessionData } as any)).toEqual({
      data: sessionData,
    })
    expect(client.getInvoice).not.toHaveBeenCalled()
    expect(client.createInvoice).not.toHaveBeenCalled()
    expect(client.closeInvoice).not.toHaveBeenCalled()
  })
})
