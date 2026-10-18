import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { STOREFRONT_MODULE } from "../../../../../modules/storefront"
import { validateCampaignForPublish } from "../../../../../modules/storefront/campaign-rules"
import type StorefrontModuleService from "../../../../../modules/storefront/service"
import { publishHomeCampaignWorkflow } from "../../../../../workflows/publish-home-campaign"

// Makes one home campaign live and ends the old live campaign.
// Medusa lets only a logged-in admin user use a route below /admin.
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = req.params.id

  // The check runs before the workflow, so a failed check changes no row.
  const campaign = await service.retrieveHomeCampaign(id)
  let categoryExists = false
  if (campaign.link_type === "category" && campaign.link_category_id) {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id"],
      filters: { id: campaign.link_category_id },
    })
    categoryExists = data.length > 0
  }
  const message = validateCampaignForPublish(campaign, { categoryExists })
  if (message) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
  }

  const { result } = await publishHomeCampaignWorkflow(req.scope).run({
    input: { id },
    throwOnError: true,
  })

  res.json({ home_campaign: result.campaign, ended_id: result.ended_id })
}
