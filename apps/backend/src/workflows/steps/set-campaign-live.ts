import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import type { HomeCampaignRecord } from "../../modules/storefront/models/home-campaign"
import type StorefrontModuleService from "../../modules/storefront/service"

export type SetCampaignLiveStepInput = { id: string }

type PreviousState = Pick<HomeCampaignRecord, "id" | "status" | "went_live_at" | "ended_at">

// Makes the home campaign live. The compensation function restores the previous status and
// dates.
export const setCampaignLiveStep = createStep(
  "set-campaign-live",
  async (input: SetCampaignLiveStepInput, { container }) => {
    const service: StorefrontModuleService = container.resolve(STOREFRONT_MODULE)

    // The generated retrieve method throws NOT_FOUND for an unknown or a deleted id.
    const campaign = await service.retrieveHomeCampaign(input.id)
    if (campaign.status === "live") {
      return new StepResponse(campaign, null)
    }

    const previous: PreviousState = {
      id: campaign.id,
      status: campaign.status,
      went_live_at: campaign.went_live_at,
      ended_at: campaign.ended_at,
    }
    const live = await service.updateHomeCampaigns({
      id: campaign.id,
      status: "live",
      went_live_at: new Date(),
      ended_at: null,
    })

    return new StepResponse(live, previous)
  },
  async (previous: PreviousState | null | undefined, { container }) => {
    if (!previous) {
      return
    }
    const service: StorefrontModuleService = container.resolve(STOREFRONT_MODULE)
    await service.updateHomeCampaigns(previous)
  }
)
