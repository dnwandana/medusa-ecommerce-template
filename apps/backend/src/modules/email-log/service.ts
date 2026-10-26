import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import { renderEmail } from "../../email/render"

type InjectedDependencies = { logger: Logger }

export type EmailLogOptions = { channels: string[] }

// Holds the email channel when SMTP_HOST is empty. It renders each email, so that a bad template
// or incomplete data fails as it fails with SMTP. It never logs the recipient.
class EmailLogNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "email-log"

  protected logger_: Logger

  constructor({ logger }: InjectedDependencies, _options: EmailLogOptions) {
    super()
    this.logger_ = logger
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const template = notification.template
    const { subject, text } = renderEmail(template, notification.data)

    this.logger_.info(
      `SMTP_HOST is empty, so the backend did not send the "${template}" email. ` +
        `Subject: "${subject}". Set SMTP_HOST to send the emails.`
    )

    // The magic-link and password-reset texts hold a sign-in link. A production log must not
    // hold it, because other people can read the log.
    if (process.env.NODE_ENV !== "production") {
      this.logger_.info(`Text of the "${template}" email:\n${text}`)
    }

    return { id: "email-log" }
  }
}

export default EmailLogNotificationProviderService
