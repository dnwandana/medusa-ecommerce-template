import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { isAllowedSocialUrl, SOCIAL_NETWORK_IDS } from "../../../lib/social-networks"
import { ADDRESS_MAX_LENGTH, E164_PATTERN, SOCIAL_LINKS_MAX } from "../../../lib/store-contact"
import { STOREFRONT_MODULE } from "../../../modules/storefront"
import type StorefrontModuleService from "../../../modules/storefront/service"

const SocialLinkSchema = z
  .object({
    network: z.enum(SOCIAL_NETWORK_IDS),
    url: z.string().trim(),
  })
  .strict()
  .refine((link) => isAllowedSocialUrl(link.network, link.url))

// The POST replaces the whole contact, so all five keys are required. null clears a value. The
// schema does not accept an empty string, so the database has no empty value next to null. The
// phone and the WhatsApp number accept any country in the E.164 format.
export const PostAdminStoreContactSchema = z
  .object({
    email: z.string().trim().email().nullable(),
    phone: z.string().trim().regex(E164_PATTERN).nullable(),
    whatsapp: z.string().trim().regex(E164_PATTERN).nullable(),
    address: z.string().trim().min(1).max(ADDRESS_MAX_LENGTH).nullable(),
    social_links: z.array(SocialLinkSchema).max(SOCIAL_LINKS_MAX),
  })
  .strict()

export type PostAdminStoreContactBody = z.infer<typeof PostAdminStoreContactSchema>

// Returns the store contact. The values are null when the owner did not save a contact.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ contact: await service.getContact() })
}

// Replaces the store contact.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminStoreContactBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ contact: await service.setContact(req.validatedBody) })
}
