import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"
import { readStoreForEmail } from "../../../../../lib/store-for-email"
import { readStorefrontUrl, storefrontLink } from "../../../../../lib/storefront-url"
import { CUSTOMER_LOCALE, CUSTOMER_WELCOME_SENT_AT } from "../../../../../lib/storefront-metadata"
import { toEmailLocale } from "../../../../../email/templates/i18n"
import type { WelcomeEmailData } from "../../../../../email/templates/welcome"

export const PostStoreWelcomeSchema = z
  .object({
    first_name: z.string().trim().max(100).optional(),
    last_name: z.string().trim().max(100).optional(),
  })
  .strict()

export type PostStoreWelcomeBody = z.infer<typeof PostStoreWelcomeSchema>

// Saves the name of a new account and sends the welcome email one time. "Skip" sends {} and
// keeps the name. Medusa authenticates each route below /store/customers/me.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostStoreWelcomeBody>,
  res: MedusaResponse
): Promise<void> => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const shopUrl = readStorefrontUrl(req.scope)
  if (!shopUrl) {
    logger.error("The welcome email was not sent. STOREFRONT_URL has no value.")
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "We could not send the email.")
  }

  const locale = toEmailLocale(req.get("x-medusa-locale"))
  const customerId = req.auth_context.actor_id
  const firstName = req.validatedBody.first_name ?? ""
  const lastName = req.validatedBody.last_name ?? ""

  // The lock makes a double click or two tabs send one email. The mark is read inside the lock.
  const sent = await req.scope
    .resolve(Modules.LOCKING)
    .execute(`welcome:${customerId}`, async () => {
      const customer = await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(customerId)
      if (customer.metadata?.[CUSTOMER_WELCOME_SENT_AT]) {
        return false
      }

      await updateCustomersWorkflow(req.scope).run({
        input: {
          selector: { id: customerId },
          update: {
            metadata: {
              ...customer.metadata,
              [CUSTOMER_WELCOME_SENT_AT]: new Date().toISOString(),
              [CUSTOMER_LOCALE]: locale,
            },
            ...(firstName ? { first_name: firstName, last_name: lastName || null } : {}),
          },
        },
      })

      const data: WelcomeEmailData = {
        locale,
        store: await readStoreForEmail(req.scope),
        first_name: firstName || customer.first_name || null,
        // The home page URL has no trailing slash: the base for en-US and the base plus /id for id-ID.
        shop_url: storefrontLink(shopUrl, locale, "/").replace(/\/+$/, ""),
      }
      try {
        await req.scope.resolve(Modules.NOTIFICATION).createNotifications({
          to: customer.email,
          channel: "email",
          template: "welcome",
          data,
        })
        return true
      } catch (error) {
        // The mark stays, so the route never sends a second email.
        const cause = error instanceof Error ? error.message : String(error)
        logger.error(`The welcome email failed. Cause: ${cause}`)
        return false
      }
    })

  res.json({ sent })
}
