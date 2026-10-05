const MAYAR_TEST_ORIGIN = "https://mayar.test"

export type MockInvoice = {
  id: string
  amount: number
  status: "unpaid" | "paid" | "closed"
  extraData?: Record<string, unknown>
}

export type MayarMock = {
  invoices: Map<string, MockInvoice>
  requests: { method: string; path: string }[]
  setInvoiceStatus(id: string, status: MockInvoice["status"]): void
  setInvoiceAmount(id: string, amount: number): void
  setDown(down: boolean): void
  restore(): void
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })

// Replaces global.fetch for the Mayar test host. Each other URL goes to the original fetch.
export function installMayarMock(): MayarMock {
  const originalFetch = global.fetch
  const invoices = new Map<string, MockInvoice>()
  const requests: { method: string; path: string }[] = []
  let down = false

  const invoiceOrThrow = (id: string) => {
    const invoice = invoices.get(id)
    if (!invoice) {
      throw new Error(`The Mayar mock has no invoice ${id}.`)
    }
    return invoice
  }

  global.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : (input.url ?? String(input))
    if (!url.startsWith(MAYAR_TEST_ORIGIN)) {
      return originalFetch(input, init)
    }

    const method = (init?.method ?? "GET").toUpperCase()
    const path = new URL(url).pathname
    requests.push({ method, path })

    if (down) {
      return json(503, { statusCode: 503, messages: "Service Unavailable" })
    }

    if (method === "POST" && path === "/hl/v2/invoices/create") {
      const body = JSON.parse(init.body)
      const id = `inv_${invoices.size + 1}`
      const amount = body.items.reduce((sum: number, i: any) => sum + i.quantity * i.rate, 0)
      invoices.set(id, { id, amount, status: "unpaid", extraData: body.extraData })
      return json(200, {
        statusCode: 200,
        messages: "success",
        data: { id, transactionId: `trx_${id}`, link: `${MAYAR_TEST_ORIGIN}/pay/${id}` },
      })
    }

    const detail = path.match(/^\/hl\/v2\/invoices\/([^/]+)$/)
    if (method === "GET" && detail) {
      const invoice = invoices.get(detail[1])
      if (!invoice) {
        return json(404, { statusCode: 404, messages: "Not Found" })
      }
      return json(200, {
        statusCode: 200,
        messages: "success",
        data: {
          id: invoice.id,
          amount: invoice.amount,
          status: invoice.status,
          transactions: [{ id: `trx_${invoice.id}`, extraData: invoice.extraData }],
        },
      })
    }

    const close = path.match(/^\/hl\/v2\/products\/([^/]+)\/closed$/)
    if (method === "POST" && close) {
      const invoice = invoices.get(close[1])
      if (!invoice) {
        return json(404, { statusCode: 404, messages: "Not Found" })
      }
      invoice.status = "closed"
      return json(200, { statusCode: 200, messages: "success" })
    }

    return json(404, { statusCode: 404, messages: `No mock for ${method} ${path}` })
  }) as typeof fetch

  return {
    invoices,
    requests,
    setInvoiceStatus: (id, status) => {
      invoiceOrThrow(id).status = status
    },
    setInvoiceAmount: (id, amount) => {
      invoiceOrThrow(id).amount = amount
    },
    setDown: (value) => {
      down = value
    },
    restore: () => {
      global.fetch = originalFetch
    },
  }
}
