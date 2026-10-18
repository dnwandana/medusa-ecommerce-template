import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_MODULE } from "../../../../modules/storefront"
import type StorefrontModuleService from "../../../../modules/storefront/service"
import type { PostAdminHomeCampaignBody } from "../route"

// Returns one home campaign. The service throws NOT_FOUND for an unknown or deleted id.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ home_campaign: await service.retrieveHomeCampaign(req.params.id) })
}

// Replaces the content and the link of one home campaign. The body has no status and no dates, so
// the update keeps them. A live campaign changes on the home page at once.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminHomeCampaignBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)
  const id = req.params.id

  // The generated update method does not give 404 for an unknown id, so the route reads first.
  await service.retrieveHomeCampaign(id)
  const home_campaign = await service.updateHomeCampaigns({ id, ...req.validatedBody })

  res.json({ home_campaign })
}

// Soft-deletes a draft. The service throws NOT_ALLOWED for a live or an ended campaign.
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)
  const id = req.params.id

  await service.deleteDraftCampaign(id)

  res.json({ id, object: "home_campaign", deleted: true })
}
