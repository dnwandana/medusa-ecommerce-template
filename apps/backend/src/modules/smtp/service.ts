import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { createTransport, type Mail } from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { renderTemplate } from "../../email/templates"
import { htmlToText } from "../../email/text"
import { type SmtpOptions, transportOptions, validateSmtpOptions } from "./options"

type InjectedDependencies = { logger: Logger }

// Returns "Code: X." and, if the server sent one, "Response code: N.". The error message can
// contain the recipient or the SMTP user, so this function never reads it.
function describeSmtpError(error: unknown): string {
  const { code, responseCode } = (error ?? {}) as { code?: unknown; responseCode?: unknown }
  const parts = [`Code: ${typeof code === "string" && code ? code : "unknown"}.`]
  if (typeof responseCode === "number") {
    parts.push(`Response code: ${responseCode}.`)
  }
  return parts.join(" ")
}

class SmtpNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "smtp"

  protected logger_: Logger
  protected options_: SmtpOptions
  // One transporter with no pool. Each send opens and closes its own connection.
  protected transporter_: Mail<SMTPTransport.SentMessageInfo>

  constructor({ logger }: InjectedDependencies, options: SmtpOptions) {
    super()
    this.logger_ = logger
    this.options_ = options
    this.transporter_ = createTransport(transportOptions(options))
  }

  static validateOptions(options: Record<any, any>): void {
    validateSmtpOptions(options)
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

    // The template renders before the send, so a bad template never opens a connection.
    const { subject, html } = renderTemplate(template, notification.data)
    const text = htmlToText(html)

    const from = this.options_.fromName
      ? { name: this.options_.fromName, address: this.options_.from }
      : this.options_.from

    // A reply goes to the store contact. Without a contact email, the reply goes to the sender.
    const contactEmail = (notification.data as any)?.store?.contact_email
    const replyTo =
      typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim() : undefined

    let messageId: string
    try {
      const info = await this.transporter_.sendMail({
        from,
        to: notification.to,
        subject,
        html,
        text,
        ...(replyTo && { replyTo }),
      })
      messageId = info.messageId
    } catch (error) {
      this.fail(`SMTP did not send the "${template}" email. ${describeSmtpError(error)}`)
    }

    return { id: messageId }
  }

  // Writes the message to the log and throws it. The message never contains the recipient, the
  // SMTP user, or the SMTP password.
  private fail(message: string): never {
    this.logger_.error(message)
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
  }
}

export default SmtpNotificationProviderService
