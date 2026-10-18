import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import type StorefrontModuleService from "../../modules/storefront/service"

export type EndLiveCampaignStepInput = { exclude_id: string }

// Ends the live home campaign, unless it is the campaign that goes live. The compensation function
// makes the ended campaign live again.
export const endLiveCampaignStep = createStep(
  "end-live-campaign",
  async (input: EndLiveCampaignStepInput, { container }) => {
    const service: StorefrontModuleService = container.resolve(STOREFRONT_MODULE)

    // The unique index allows at most one live row.
    const [live] = await service.listHomeCampaigns({ status: "live" }, { take: 1 })
    if (!live || live.id === input.exclude_id) {
      return new StepResponse({ ended_id: null as string | null }, null)
    }

    await service.updateHomeCampaigns({ id: live.id, status: "ended", ended_at: new Date() })

    return new StepResponse({ ended_id: live.id as string | null }, live.id)
  },
  async (endedId: string | null | undefined, { container }) => {
    if (!endedId) {
      return
    }
    const service: StorefrontModuleService = container.resolve(STOREFRONT_MODULE)
    await service.updateHomeCampaigns({ id: endedId, status: "live", ended_at: null })
  }
)
