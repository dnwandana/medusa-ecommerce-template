import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { STOREFRONT_MODULE } from "../../../../modules/storefront"
import {
  campaignLocale,
  localizeCampaign,
  resolveCampaignLink,
  type StoreHomeCampaign,
} from "../../../../modules/storefront/campaign-rules"
import type StorefrontModuleService from "../../../../modules/storefront/service"

// Returns the live home campaign in the locale of the x-medusa-locale header, or null when no
// campaign is live. The response has only the fields of StoreHomeCampaign, so the staff fields
// (name, status and dates) stay private. The route needs only the publishable API key.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const live = await service.getLiveCampaign()
  if (!live) {
    res.json({ campaign: null })
    return
  }

  // A deleted, inactive or internal category gives no handle, so the link becomes /products.
  let categoryHandle: string | null = null
  if (live.link_type === "category" && live.link_category_id) {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["handle"],
      filters: { id: live.link_category_id, is_active: true, is_internal: false },
    })
    categoryHandle = data[0]?.handle ?? null
  }

  const link = resolveCampaignLink(live, categoryHandle)
  const campaign: StoreHomeCampaign = localizeCampaign(
    live,
    campaignLocale(req.get("x-medusa-locale")),
    link
  )

  res.json({ campaign })
}
