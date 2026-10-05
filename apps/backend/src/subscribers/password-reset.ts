import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type PasswordResetEvent = { entity_id: string; actor_type: string; token: string }

const DEFAULT_BACKEND_URL = "http://localhost:9000"
const DEFAULT_ADMIN_PATH = "/app"

// Sends the email with the reset link. The log messages do not contain the token
// or the email address.
export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetEvent>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { entity_id, actor_type, token } = data
    const configModule = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const admin = configModule.admin ?? {}

    let baseUrl: string
    if (actor_type === "customer") {
      const storefrontUrl = (admin.storefrontUrl ?? "").replace(/\/$/, "")
      if (!storefrontUrl) {
        logger.error("The password-reset email was not sent. STOREFRONT_URL has no value.")
        return
      }
      baseUrl = `${storefrontUrl}/account/reset-password`
    } else {
      // The Medusa default for backendUrl is "/". The value can also be empty.
      const backendUrl =
        !admin.backendUrl || admin.backendUrl === "/"
          ? DEFAULT_BACKEND_URL
          : admin.backendUrl.replace(/\/$/, "")
      baseUrl = `${backendUrl}${admin.path ?? DEFAULT_ADMIN_PATH}/reset-password`
    }

    const reset_url =
      `${baseUrl}?token=${encodeURIComponent(token)}` +
      `&email=${encodeURIComponent(entity_id)}`

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: entity_id,
      channel: "email",
      template: "password-reset",
      data: { reset_url },
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The password-reset email failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
