import MayarPaymentProviderService from "../service"
import { defaultOptions, makeService } from "./helpers"

const customer = { name: "Budi Santoso", email: "buyer@example.com", mobile: "081234567890" }
const input = {
  amount: 95000,
  currency_code: "idr",
  data: { session_id: "payses_1", customer },
  context: {},
}
const created = { id: "inv_1", transactionId: "trx_1", link: "https://store.myr.id/invoices/abc" }

describe("MayarPaymentProviderService: initiatePayment", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-10-02T00:00:00.000Z"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("has the identifier mayar", () => {
    expect(MayarPaymentProviderService.identifier).toBe("mayar")
  })

  it("creates an invoice for the cart total", async () => {
    const { service, client } = makeService()
    client.createInvoice.mockResolvedValue(created)

    await service.initiatePayment(input as any)

    expect(client.createInvoice).toHaveBeenCalledTimes(1)
    expect(client.createInvoice).toHaveBeenCalledWith({
      name: "Budi Santoso",
      email: "buyer@example.com",
      mobile: "081234567890",
      description: "Order payment",
      redirectUrl: "http://localhost:3000/checkout/return",
      expiredAt: "2026-10-03T00:00:00.000Z",
      items: [{ quantity: 1, rate: 95000, description: "Order payment" }],
      extraData: { session_id: "payses_1" },
    })
  })

  it("returns the invoice id, the link, the expiry, and the amount", async () => {
    const { service, client } = makeService()
    client.createInvoice.mockResolvedValue(created)

    const output = await service.initiatePayment(input as any)

    expect(output).toEqual({
      id: "inv_1",
      status: "pending",
      data: {
        invoice_id: "inv_1",
        payment_url: "https://store.myr.id/invoices/abc",
        expired_at: "2026-10-03T00:00:00.000Z",
        amount: 95000,
      },
    })
  })

  it("accepts an amount that is a string", async () => {
    const { service, client } = makeService()
    client.createInvoice.mockResolvedValue(created)

    const output = await service.initiatePayment({ ...input, amount: "95000" } as any)

    expect(client.createInvoice.mock.calls[0][0].items[0].rate).toBe(95000)
    expect((output.data as any).amount).toBe(95000)
  })

  it("removes a slash at the end of the storefront URL", async () => {
    const { service, client } = makeService({ storefrontUrl: "https://shop.example.com/" })
    client.createInvoice.mockResolvedValue(created)

    await service.initiatePayment(input as any)

    expect(client.createInvoice.mock.calls[0][0].redirectUrl).toBe(
      "https://shop.example.com/checkout/return"
    )
  })

  it("uses the logged-in customer when the data has no customer", async () => {
    const { service, client } = makeService()
    client.createInvoice.mockResolvedValue(created)

    await service.initiatePayment({
      ...input,
      data: { session_id: "payses_1" },
      context: {
        customer: {
          id: "cus_1",
          email: "siti@example.com",
          first_name: "Siti",
          last_name: "Rahma",
          phone: "089876543210",
        },
      },
    } as any)

    expect(client.createInvoice.mock.calls[0][0]).toMatchObject({
      name: "Siti Rahma",
      email: "siti@example.com",
      mobile: "089876543210",
    })
  })

  // Review Focus: a guest checkout with no mobile number or no name.
  it.each([
    ["name", { ...customer, name: " " }],
    ["email address", { ...customer, email: "" }],
    ["mobile number", { name: customer.name, email: customer.email }],
  ])("stops before the Mayar call when the %s is absent", async (field, partial) => {
    const { service, client } = makeService()

    await expect(
      service.initiatePayment({
        ...input,
        data: { session_id: "payses_1", customer: partial },
      } as any)
    ).rejects.toThrow(`The Mayar payment needs the ${field} of the customer.`)
    expect(client.createInvoice).not.toHaveBeenCalled()
  })

  it("stops when no customer data is given", async () => {
    const { service, client } = makeService()
    await expect(
      service.initiatePayment({ ...input, data: { session_id: "payses_1" } } as any)
    ).rejects.toThrow("The Mayar payment needs the name of the customer.")
    expect(client.createInvoice).not.toHaveBeenCalled()
  })

  it("accepts only IDR", async () => {
    const { service, client } = makeService()
    await expect(
      service.initiatePayment({ ...input, currency_code: "usd" } as any)
    ).rejects.toThrow("Mayar accepts only IDR. The currency of the payment is usd.")
    expect(client.createInvoice).not.toHaveBeenCalled()
  })

  it("lets an error of the Mayar API pass through", async () => {
    const { service, client } = makeService()
    client.createInvoice.mockRejectedValue(new Error("The Mayar request failed."))
    await expect(service.initiatePayment(input as any)).rejects.toThrow("The Mayar request failed.")
  })
})

describe("MayarPaymentProviderService: validateOptions", () => {
  it("requires the apiUrl and storefrontUrl options", () => {
    expect(() =>
      MayarPaymentProviderService.validateOptions({ ...defaultOptions, apiUrl: "" })
    ).toThrow("The apiUrl option of mayar is required.")
    expect(() =>
      MayarPaymentProviderService.validateOptions({ ...defaultOptions, storefrontUrl: "" })
    ).toThrow("The storefrontUrl option of mayar is required.")
  })

  it("permits an empty API key, so that the backend starts without one", () => {
    expect(() =>
      MayarPaymentProviderService.validateOptions({ ...defaultOptions, apiKey: "" })
    ).not.toThrow()
  })
})
