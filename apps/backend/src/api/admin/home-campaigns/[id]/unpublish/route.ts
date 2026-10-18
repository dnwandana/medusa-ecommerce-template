import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_MODULE } from "../../../../../modules/storefront"
import type StorefrontModuleService from "../../../../../modules/storefront/service"

// Ends the live home campaign. The route changes one row of one module, so it calls the service.
// The service throws NOT_ALLOWED for a campaign that is not live.
// Medusa lets only a logged-in admin user use a route below /admin.
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ home_campaign: await service.unpublishCampaign(req.params.id) })
}
