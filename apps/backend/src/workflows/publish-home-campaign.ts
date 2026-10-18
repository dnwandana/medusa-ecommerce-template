import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { endLiveCampaignStep } from "./steps/end-live-campaign"
import { setCampaignLiveStep } from "./steps/set-campaign-live"

export type PublishHomeCampaignInput = { id: string }

// Makes a home campaign live and ends the old live campaign. The end step runs first, because the
// unique index allows only one live row. If the second step fails, the compensation makes the old
// campaign live again.
export const publishHomeCampaignWorkflow = createWorkflow(
  "publish-home-campaign",
  function (input: PublishHomeCampaignInput) {
    const { ended_id } = endLiveCampaignStep({ exclude_id: input.id })
    const campaign = setCampaignLiveStep({ id: input.id })

    return new WorkflowResponse({ campaign, ended_id })
  }
)
