import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { MAGIC_LINK_MODULE } from "../../../modules/magic-link"
import { describeBrowser } from "../../../modules/magic-link/browser"
import type MagicLinkModuleService from "../../../modules/magic-link/service"
import type { MagicLinkEmailData } from "../../../modules/brevo/templates/magic-link"

export const PostStoreMagicLinkSchema = z
  .object({ email: z.string().trim().pipe(z.email().max(254)) })
  .strict()

export type PostStoreMagicLinkBody = z.infer<typeof PostStoreMagicLinkSchema>

const DEFAULT_STORE_NAME = "our store"

// The sign-in page has a Bahasa Indonesia version only. Each other locale gets the English page.
export function magicLinkLocale(header: string | undefined): "en-US" | "id-ID" {
  return header === "id-ID" ? "id-ID" : "en-US"
}

// Returns admin.storefrontUrl of the config with no trailing slash, or null when it has no value.
export function readStorefrontUrl(scope: MedusaContainer): string | null {
  const config = scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const url = config.admin?.storefrontUrl?.trim()
  return url ? url.replace(/\/+$/, "") : null
}

// Returns the name of the first Medusa store for the emails.
export async function readStoreName(scope: MedusaContainer): Promise<string> {
  const [store] = await scope.resolve(Modules.STORE).listStores({}, { take: 1 })
  return store?.name || DEFAULT_STORE_NAME
}

// The account customer wins. Else a guest customer with a first name gives the name.
async function readFirstName(scope: MedusaContainer, email: string): Promise<string | null> {
  const customerModule = scope.resolve(Modules.CUSTOMER)
  const [account] = await customerModule.listCustomers({ email, has_account: true }, { take: 1 })
  if (account) return account.first_name || null
  const customers = await customerModule.listCustomers({ email }, { order: { created_at: "ASC" } })
  return customers.find((customer) => customer.first_name)?.first_name ?? null
}

// Sends a one-time sign-in link to the email. The answer is the same for a known and an unknown
// email. The secret goes only to the browser and the token goes only to the email.
export const POST = async (
  req: MedusaRequest<PostStoreMagicLinkBody>,
  res: MedusaResponse
): Promise<void> => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const storefrontUrl = readStorefrontUrl(req.scope)
  if (!storefrontUrl) {
    logger.error("The magic link was not sent. STOREFRONT_URL has no value.")
    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "We could not send the link.")
  }

  const email = req.validatedBody.email.toLowerCase()
  const locale = magicLinkLocale(req.get("x-medusa-locale"))
  const browser = describeBrowser(req.get("user-agent"))
  const magicLink: MagicLinkModuleService = req.scope.resolve(MAGIC_LINK_MODULE)

  // The lock makes the check of the 60 second rule and the insert one step. Without it, requests
  // at the same time for one email all pass the check and send one link each.
  const request = await req.scope
    .resolve(Modules.LOCKING)
    .execute(`magic-link:${email}`, () => magicLink.createRequest({ email, locale, browser }))
  if (!request) {
    res
      .status(429)
      .json({ type: "rate_limited", message: "Wait 60 seconds before you ask for a new link." })
    return
  }

  const localePath = locale === "id-ID" ? "/id" : ""
  const sign_in_url =
    `${storefrontUrl}${localePath}/account/sign-in/verify` +
    `?id=${encodeURIComponent(request.request_id)}&token=${encodeURIComponent(request.token)}`

  const [first_name, store_name] = await Promise.all([
    readFirstName(req.scope, email),
    readStoreName(req.scope),
  ])
  const data: MagicLinkEmailData = {
    store_name,
    first_name,
    sign_in_url,
    browser,
    requested_at: request.created_at.toISOString(),
  }

  try {
    await req.scope.resolve(Modules.NOTIFICATION).createNotifications({
      to: email,
      channel: "email",
      template: "magic-link",
      data,
    })
  } catch (error) {
    // A link that the customer never got must not block a new request for 60 seconds.
    await magicLink.updateMagicLinkRequests({ id: request.request_id, invalidated_at: new Date() })
    const message = error instanceof Error ? error.message : String(error)
    const cause = message.split(email).join("<email>").split(request.token).join("<token>")
    logger.error(`The magic link email failed. Cause: ${cause}`)
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "We could not send the link. Try again."
    )
  }

  // Only a sent link replaces the older links. After a failed email, the older link still works.
  await magicLink.invalidateOlderLinks(email, request)

  res.json({
    request_id: request.request_id,
    secret: request.secret,
    expires_at: request.expires_at,
  })
}
