import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { STOREFRONT_MODULE } from "../../../../modules/storefront"
import type StorefrontModuleService from "../../../../modules/storefront/service"
import { LOW_STOCK_MAX, NEW_BADGE_DAYS_MAX } from "../../../../modules/storefront/settings-rules"

// 0 turns a badge off. The service sorts the price limits and removes the duplicates.
export const PostAdminStorefrontSettingsSchema = z
  .object({
    new_badge_days: z.number().int().min(0).max(NEW_BADGE_DAYS_MAX),
    low_stock_threshold: z.number().int().min(0).max(LOW_STOCK_MAX),
    price_limits: z.array(z.number().int().positive()),
  })
  .strict()

export type PostAdminStorefrontSettingsBody = z.infer<typeof PostAdminStorefrontSettingsSchema>

// Returns the storefront settings. The values are the defaults when staff saved no settings.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ settings: await service.getSettings() })
}

// Replaces the three storefront settings.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminStorefrontSettingsBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ settings: await service.saveSettings(req.validatedBody) })
}
