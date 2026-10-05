import {
  AbstractPaymentProvider,
  MathBN,
  MedusaError,
  PaymentActions,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  BigNumberInput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  PaymentProviderContext,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { MayarClient } from "./client"
import { checkInvoice, findSessionId, isPaidStatus } from "./invoice"
import type { MayarCustomer, MayarInvoice, MayarOptions, MayarSessionData } from "./types"

const INVOICE_LIFETIME_MS = 24 * 60 * 60 * 1000
const INVOICE_DESCRIPTION = "Order payment"

type InjectedDependencies = { logger: Logger }

const trimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "")

class MayarPaymentProviderService extends AbstractPaymentProvider<MayarOptions> {
  static identifier = "mayar"

  protected logger_: Logger
  protected options_: MayarOptions
  protected client_: MayarClient

  constructor(container: InjectedDependencies, options: MayarOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.client_ = new MayarClient({ apiUrl: options.apiUrl, apiKey: options.apiKey })
  }

  // The API key can be empty, so that the backend starts before the developer adds a key.
  static validateOptions(options: Record<any, any>): void {
    if (!options.apiUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The apiUrl option of mayar is required."
      )
    }
    if (!options.storefrontUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The storefrontUrl option of mayar is required."
      )
    }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const data = await this.createInvoice_(input)
    return { id: data.invoice_id, status: "pending", data }
  }

  // Medusa returns the cart with status 200 only for a payment authorization error. A "pending"
  // status gives status 400, and then the storefront cannot try the completion again.
  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const status = await this.resolveStatus_(input.data)
    if (status !== "captured") {
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        `The payment for the Mayar invoice ${this.invoiceId_(input.data)} is not confirmed.`
      )
    }
    return { status, data: input.data }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const status = await this.resolveStatus_(input.data)
    return { status, data: input.data }
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const invoice = await this.client_.getInvoice(this.invoiceId_(input.data))
    return { data: { ...input.data, mayar_status: invoice.status } }
  }

  // Mayar captures the payment when the customer pays, so this method has no operation.
  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    await this.closeInvoice_(input.data)
    return { data: input.data }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    await this.closeInvoice_(input.data)
    return { data: input.data }
  }

  // Mayar cannot change the amount of an invoice, so close the old invoice and create a new one.
  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    await this.closeInvoice_(input.data)
    const newData = await this.createInvoice_({
      amount: input.amount,
      currency_code: input.currency_code,
      data: input.data,
      context: input.context,
    })
    return { data: { ...input.data, ...newData } }
  }

  // Mayar has no refund API, so the refund exists in Medusa only.
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const amount = MathBN.convert(input.amount).toNumber()
    this.logger_.warn(
      `Medusa recorded a refund of ${amount} for the Mayar invoice ${input.data?.invoice_id}. Mayar has no refund API. Return the money in the Mayar dashboard.`
    )
    return { data: input.data }
  }

  // The webhook body has no signature, so the provider reads only the invoice id from it. It then
  // fetches the invoice from the Mayar API. This method never throws.
  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const notSupported: WebhookActionResult = { action: PaymentActions.NOT_SUPPORTED }

    const body = payload?.data as Record<string, unknown> | undefined
    if (!body || typeof body !== "object" || body.event !== "payment.received") {
      return notSupported
    }
    const eventData = body.data as Record<string, unknown> | undefined
    const invoiceId = eventData && typeof eventData === "object" ? eventData.productId : undefined
    if (typeof invoiceId !== "string" || invoiceId.length === 0) {
      return notSupported
    }

    let invoice: MayarInvoice
    try {
      invoice = await this.client_.getInvoice(invoiceId)
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error)
      this.logger_.error(
        `The Mayar webhook for the invoice ${invoiceId} was not confirmed. Cause: ${cause}`
      )
      return notSupported
    }

    if (!isPaidStatus(invoice?.status)) {
      return notSupported
    }
    const sessionId = findSessionId(invoice)
    if (sessionId === undefined) {
      this.logger_.warn(
        `The paid Mayar invoice ${invoiceId} has no session id. The check-paid-carts job completes the cart.`
      )
      return notSupported
    }

    // The amount is not compared here, because this method has no access to the session.
    // Medusa then calls authorizePayment, and that method compares the amounts.
    return {
      action: PaymentActions.SUCCESSFUL,
      data: { session_id: sessionId, amount: Number(invoice.amount) },
    }
  }

  // Fetches the invoice of a payment session and maps it to a Medusa status.
  protected async resolveStatus_(data?: Record<string, unknown>): Promise<"captured" | "pending"> {
    const invoiceId = this.invoiceId_(data)
    const invoice = await this.client_.getInvoice(invoiceId)
    const check = checkInvoice(invoice, Number(data?.amount))
    if (check === "paid") {
      return "captured"
    }
    if (check === "amount_mismatch") {
      this.logger_.error(
        `The Mayar invoice ${invoiceId} is paid with the amount ${invoice.amount}, but the payment session ${data?.session_id} expects ${data?.amount}.`
      )
    }
    return "pending"
  }

  // Closes the invoice of a payment session. It does not throw, because an open invoice expires
  // and must not stop a cart change.
  protected async closeInvoice_(data?: Record<string, unknown>): Promise<void> {
    const invoiceId = data?.invoice_id
    if (typeof invoiceId !== "string" || invoiceId.length === 0) {
      return
    }
    try {
      await this.client_.closeInvoice(invoiceId)
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error)
      this.logger_.warn(`Mayar did not close the invoice ${invoiceId}. Cause: ${cause}`)
    }
  }

  // Returns the invoice id of a payment session, or throws if it is absent.
  protected invoiceId_(data?: Record<string, unknown>): string {
    const invoiceId = data?.invoice_id
    if (typeof invoiceId !== "string" || invoiceId.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The payment session has no Mayar invoice id."
      )
    }
    return invoiceId
  }

  // Creates one Mayar invoice and returns the data for the payment session.
  protected async createInvoice_(input: {
    amount: BigNumberInput
    currency_code: string
    data?: Record<string, unknown>
    context?: PaymentProviderContext
  }): Promise<MayarSessionData> {
    if (input.currency_code.toLowerCase() !== "idr") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Mayar accepts only IDR. The currency of the payment is ${input.currency_code}.`
      )
    }
    const customer = this.resolveCustomer_(input.data, input.context)
    const amount = MathBN.convert(input.amount).toNumber()
    const expiredAt = new Date(Date.now() + INVOICE_LIFETIME_MS).toISOString()
    const storefrontUrl = this.options_.storefrontUrl.replace(/\/+$/, "")

    const invoice = await this.client_.createInvoice({
      ...customer,
      description: INVOICE_DESCRIPTION,
      redirectUrl: `${storefrontUrl}/checkout/return`,
      expiredAt,
      items: [{ quantity: 1, rate: amount, description: INVOICE_DESCRIPTION }],
      extraData: { session_id: String(input.data?.session_id) },
    })

    return {
      invoice_id: invoice.id,
      payment_url: invoice.link,
      expired_at: expiredAt,
      amount,
    }
  }

  // Reads the customer contact from the session data, or from the logged-in customer.
  protected resolveCustomer_(
    data?: Record<string, unknown>,
    context?: PaymentProviderContext
  ): MayarCustomer {
    let customer: MayarCustomer
    const fromData = data?.customer
    if (fromData && typeof fromData === "object") {
      const contact = fromData as Record<string, unknown>
      customer = {
        name: trimmed(contact.name),
        email: trimmed(contact.email),
        mobile: trimmed(contact.mobile),
      }
    } else {
      const loggedIn = context?.customer
      customer = {
        name: [trimmed(loggedIn?.first_name), trimmed(loggedIn?.last_name)].join(" ").trim(),
        email: trimmed(loggedIn?.email),
        mobile: trimmed(loggedIn?.phone),
      }
    }

    const fields: [keyof MayarCustomer, string][] = [
      ["name", "name"],
      ["email", "email address"],
      ["mobile", "mobile number"],
    ]
    for (const [key, label] of fields) {
      if (!customer[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `The Mayar payment needs the ${label} of the customer.`
        )
      }
    }
    return customer
  }
}

export default MayarPaymentProviderService
