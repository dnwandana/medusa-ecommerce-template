import { MayarApiError, MayarClient } from "../client"

const options = { apiUrl: "https://api.mayar.io/hl/v2", apiKey: "test-key" }

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }) as any

const invoiceInput = {
  name: "Budi Santoso",
  email: "buyer@example.com",
  mobile: "081234567890",
  description: "Order payment",
  redirectUrl: "http://localhost:3000/checkout/return",
  expiredAt: "2026-10-03T00:00:00.000Z",
  items: [{ quantity: 1, rate: 95000, description: "Order payment" }],
  extraData: { session_id: "payses_1" },
}

describe("MayarClient", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    global.fetch = fetchMock as any
  })

  describe("createInvoice", () => {
    it("posts the invoice and returns the id and the link", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          statusCode: 200,
          messages: "success",
          data: {
            id: "inv_1",
            transactionId: "trx_1",
            link: "https://store.myr.id/invoices/abc",
            expiredAt: 1790985600000,
          },
        })
      )

      const invoice = await new MayarClient(options).createInvoice(invoiceInput)

      expect(invoice).toEqual({
        id: "inv_1",
        transactionId: "trx_1",
        link: "https://store.myr.id/invoices/abc",
        expiredAt: 1790985600000,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.mayar.io/hl/v2/invoices/create")
      expect(init.method).toBe("POST")
      expect(init.headers).toEqual({
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
        Accept: "application/json",
      })
      expect(init.signal).toBeDefined()
      expect(JSON.parse(init.body)).toEqual(invoiceInput)
    })

    it("accepts an API URL that ends with a slash", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { statusCode: 200, data: { id: "inv_1", link: "https://x/y" } })
      )
      await new MayarClient({ ...options, apiUrl: "https://api.mayar.io/hl/v2/" }).createInvoice(
        invoiceInput
      )
      expect(fetchMock.mock.calls[0][0]).toBe("https://api.mayar.io/hl/v2/invoices/create")
    })

    it("reports an error status with the message of Mayar", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(400, { statusCode: 400, messages: "Validation Error" })
      )
      const promise = new MayarClient(options).createInvoice(invoiceInput)
      await expect(promise).rejects.toThrow(
        "The Mayar request POST /invoices/create failed. Status: 400. Response: Validation Error"
      )
      await expect(promise).rejects.toBeInstanceOf(MayarApiError)
      await expect(promise).rejects.toMatchObject({ status: 400 })
    })

    it("reads the error text from the message key", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(429, {
          statusCode: 429,
          message: "Duplicate request detected. Please wait 1 minute before trying again.",
        })
      )
      await expect(new MayarClient(options).createInvoice(invoiceInput)).rejects.toThrow(
        "The Mayar request POST /invoices/create failed. Status: 429. Response: Duplicate request detected. Please wait 1 minute before trying again."
      )
    })

    // Review Focus: HTTP 200 with an error in the body, and a body that is not JSON.
    it("reports an error when HTTP is 200 and the body status is an error", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { statusCode: 404, messages: "Customer not found" })
      )
      await expect(new MayarClient(options).createInvoice(invoiceInput)).rejects.toThrow(
        "The Mayar request POST /invoices/create failed. Status: 404. Response: Customer not found"
      )
    })

    it("reports a body that is not JSON", async () => {
      fetchMock.mockResolvedValue(jsonResponse(502, "<html>Bad Gateway</html>"))
      await expect(new MayarClient(options).createInvoice(invoiceInput)).rejects.toThrow(
        "The Mayar request POST /invoices/create failed. Status: 502. Response: <html>Bad Gateway</html>"
      )
    })

    it("reports a success response that has no invoice id or no link", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { statusCode: 200, data: { id: "inv_1" } }))
      await expect(new MayarClient(options).createInvoice(invoiceInput)).rejects.toThrow(
        "The Mayar request POST /invoices/create returned no invoice id or no link."
      )
    })

    it("reports a network failure with its cause", async () => {
      fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))
      await expect(new MayarClient(options).createInvoice(invoiceInput)).rejects.toThrow(
        "The Mayar request POST /invoices/create failed. Cause: ECONNREFUSED"
      )
    })

    it("does not call Mayar when the API key is empty", async () => {
      await expect(
        new MayarClient({ ...options, apiKey: "" }).createInvoice(invoiceInput)
      ).rejects.toThrow("The Mayar API key is empty. Set MAYAR_API_KEY in apps/backend/.env.")
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe("getInvoice", () => {
    it("gets the invoice detail", async () => {
      const data = {
        id: "inv_1",
        amount: 95000,
        status: "unpaid",
        paymentUrl: "https://store.myr.id/invoices/abc",
        transactions: [],
      }
      fetchMock.mockResolvedValue(jsonResponse(200, { statusCode: 200, messages: "success", data }))

      const invoice = await new MayarClient(options).getInvoice("inv_1")

      expect(invoice).toEqual(data)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.mayar.io/hl/v2/invoices/inv_1")
      expect(init.method).toBe("GET")
      expect(init.body).toBeUndefined()
    })

    it("encodes the invoice id in the path", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { statusCode: 200, data: { id: "a/b" } }))
      await new MayarClient(options).getInvoice("a/b")
      expect(fetchMock.mock.calls[0][0]).toBe("https://api.mayar.io/hl/v2/invoices/a%2Fb")
    })

    it("reports an invoice that Mayar does not find", async () => {
      fetchMock.mockResolvedValue(jsonResponse(404, { statusCode: 404, messages: "Not Found" }))
      await expect(new MayarClient(options).getInvoice("inv_9")).rejects.toThrow(
        "The Mayar request GET /invoices/inv_9 failed. Status: 404. Response: Not Found"
      )
    })
  })

  describe("closeInvoice", () => {
    it("posts to the closed path with no body", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { statusCode: 200, messages: "success" }))

      await new MayarClient(options).closeInvoice("inv_1")

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe("https://api.mayar.io/hl/v2/products/inv_1/closed")
      expect(init.method).toBe("POST")
      expect(init.body).toBeUndefined()
    })

    // Review Focus: Mayar reports a failed close with HTTP 200.
    it("reports a failure when the message is not success", async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { statusCode: 200, messages: "failed" }))
      await expect(new MayarClient(options).closeInvoice("inv_1")).rejects.toThrow(
        "The Mayar request POST /products/inv_1/closed failed. Status: 200. Response: failed"
      )
    })
  })

  it("does not put the API key in an error message", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { statusCode: 401, messages: "Unauthorized" }))
    const error = await new MayarClient(options).getInvoice("inv_1").catch((e) => e)
    expect(error.message).not.toContain("test-key")
  })
})
