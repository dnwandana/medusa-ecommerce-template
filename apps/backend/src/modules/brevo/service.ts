import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { renderTemplate } from "./templates"

const BREVO_URL = "https://api.brevo.com/v3/smtp/email"
const REQUEST_TIMEOUT_MS = 10000

type InjectedDependencies = { logger: Logger }
export type BrevoOptions = { apiKey: string; senderEmail: string; senderName?: string }

// Returns the parsed JSON value, or undefined when the text is not JSON.
function parseJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

// Returns "code: message" for a Brevo error body. Otherwise returns the raw text, so the cause stays visible.
function describeErrorBody(text: string): string {
  const parsed = parseJson(text)
  if (parsed && typeof parsed === "object" && (parsed.code || parsed.message)) {
    return [parsed.code, parsed.message].filter(Boolean).join(": ")
  }
  return text
}

class BrevoNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "brevo"

  protected logger_: Logger
  protected options_: BrevoOptions

  constructor({ logger }: InjectedDependencies, options: BrevoOptions) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  static validateOptions(options: Record<any, any>): void {
    if (!options?.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The apiKey option of brevo is required."
      )
    }
    if (!options?.senderEmail) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The senderEmail option of brevo is required."
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = notification.template

    if (!notification.to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `The "${template}" email has no recipient.`
      )
    }

    const { subject, html } = renderTemplate(template, notification.data)

    const sender: { name?: string; email: string } = { email: this.options_.senderEmail }
    if (this.options_.senderName) {
      sender.name = this.options_.senderName
    }

    let status: number
    let ok: boolean
    let text: string
    try {
      const response = await fetch(BREVO_URL, {
        method: "POST",
        headers: {
          "api-key": this.options_.apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: notification.to }],
          subject,
          htmlContent: html,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      status = response.status
      ok = response.ok
      text = await response.text()
    } catch (error) {
      const cause = error instanceof Error ? error.message : String(error)
      this.fail(`Brevo did not send the "${template}" email. Cause: ${cause}`)
    }

    if (!ok) {
      this.fail(
        `Brevo did not send the "${template}" email. Status: ${status}. Response: ${describeErrorBody(text)}`
      )
    }

    // Brevo accepted the email. A body without a messageId must not turn the send into a failure.
    return { id: parseJson(text)?.messageId }
  }

  // Writes the message to the log and throws it. The message never contains the API key.
  private fail(message: string): never {
    this.logger_.error(message)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }
}

export default BrevoNotificationProviderService
