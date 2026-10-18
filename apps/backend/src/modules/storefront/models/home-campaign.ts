import { model } from "@medusajs/framework/utils"
import type { InferTypeOf } from "@medusajs/framework/types"

export const HOME_CAMPAIGN_STATUSES = ["draft", "live", "ended"] as const
export const HOME_CAMPAIGN_LINK_TYPES = ["category", "all_products", "path"] as const

// The hero of the storefront home page. Staff write the text in English and in Bahasa Indonesia.
// The link keeps the category id, not the handle, so that a new handle does not break the link.
const HomeCampaign = model
  .define("home_campaign", {
    id: model.id({ prefix: "hcmp" }).primaryKey(),
    name: model.text(),
    image_url: model.text(),
    mobile_image_url: model.text().nullable(),
    eyebrow_en: model.text().nullable(),
    eyebrow_id: model.text().nullable(),
    title_en: model.text(),
    title_id: model.text(),
    text_en: model.text().nullable(),
    text_id: model.text().nullable(),
    button_label_en: model.text(),
    button_label_id: model.text(),
    link_type: model.enum([...HOME_CAMPAIGN_LINK_TYPES]),
    link_category_id: model.text().nullable(),
    link_path: model.text().nullable(),
    status: model.enum([...HOME_CAMPAIGN_STATUSES]).default("draft"),
    went_live_at: model.dateTime().nullable(),
    ended_at: model.dateTime().nullable(),
  })
  // The database holds at most one live campaign.
  .indexes([{ on: ["status"], unique: true, where: "status = 'live'" }])

export type HomeCampaignRecord = InferTypeOf<typeof HomeCampaign>

export default HomeCampaign
