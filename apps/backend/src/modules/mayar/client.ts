import type { MayarCreatedInvoice, MayarInvoice, MayarInvoiceInput } from "./types"

const REQUEST_TIMEOUT_MS = 10000

type MayarResponseBody = {
  statusCode?: number
  messages?: string
  message?: string
  data?: any
}

// An error from the Mayar API or from the network. `status` is absent for a network failure.
export class MayarApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "MayarApiError"
    this.status = status
  }
}

const failureMessage = (method: string, path: string, status: number, detail: string) =>
  `The Mayar request ${method} ${path} failed. Status: ${status}. Response: ${detail}`

// Holds all calls to the Mayar Headless API. It has no Medusa dependency.
export class MayarClient {
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor(options: { apiUrl: string; apiKey: string }) {
    this.apiUrl = options.apiUrl.replace(/\/+$/, "")
    this.apiKey = options.apiKey
  }

  async createInvoice(input: MayarInvoiceInput): Promise<MayarCreatedInvoice> {
    const path = "/invoices/create"
    const body = await this.request("POST", path, path, input)
    const data = body.data
    const hasId = typeof data?.id === "string" && data.id.length > 0
    const hasLink = typeof data?.link === "string" && data.link.length > 0
    if (!hasId || !hasLink) {
      throw new MayarApiError(`The Mayar request POST ${path} returned no invoice id or no link.`)
    }
    return {
      id: data.id,
      transactionId: data.transactionId,
      link: data.link,
      expiredAt: data.expiredAt,
    }
  }

  async getInvoice(invoiceId: string): Promise<MayarInvoice> {
    const body = await this.request(
      "GET",
      `/invoices/${encodeURIComponent(invoiceId)}`,
      `/invoices/${invoiceId}`
    )
    return body.data as MayarInvoice
  }

  async closeInvoice(invoiceId: string): Promise<void> {
    const logPath = `/products/${invoiceId}/closed`
    const body = await this.request(
      "POST",
      `/products/${encodeURIComponent(invoiceId)}/closed`,
      logPath
    )
    // Mayar can report a failed close with HTTP 200, so accept only the message "success".
    if (body.messages === "success" || body.message === "success") {
      return
    }
    const status = typeof body.statusCode === "number" ? body.statusCode : 200
    const detail = String(body.messages ?? body.message ?? "no message")
    throw new MayarApiError(failureMessage("POST", logPath, status, detail), status)
  }

  // Sends one request and returns the parsed body. `logPath` is the path with the plain id, for
  // the error messages.
  private async request(
    method: "GET" | "POST",
    path: string,
    logPath: string,
    body?: unknown
  ): Promise<MayarResponseBody> {
    if (!this.apiKey) {
      throw new MayarApiError("The Mayar API key is empty. Set MAYAR_API_KEY in apps/backend/.env.")
    }

    let response: Response
    try {
      response = await fetch(`${this.apiUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error)
      throw new MayarApiError(`The Mayar request ${method} ${logPath} failed. Cause: ${cause}`)
    }

    const text = await response.text()
    let parsed: MayarResponseBody | undefined
    try {
      const value = JSON.parse(text)
      parsed = value && typeof value === "object" ? value : undefined
    } catch {
      parsed = undefined
    }

    // The statusCode in the body is the authoritative status. Mayar can send HTTP 200 with an
    // error status in the body.
    const status = typeof parsed?.statusCode === "number" ? parsed.statusCode : response.status
    if (!parsed || !response.ok || status >= 400) {
      const detail =
        (typeof parsed?.messages === "string" && parsed.messages) ||
        (typeof parsed?.message === "string" && parsed.message) ||
        text
      throw new MayarApiError(failureMessage(method, logPath, status, detail), status)
    }
    return parsed
  }
}
