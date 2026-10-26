import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { EMPTY_CONTACT, type SocialLink, type StoreContact } from "../../lib/store-contact"
import HomeCampaign, { type HomeCampaignRecord } from "./models/home-campaign"
import StoreColour from "./models/store-colour"
import StorefrontContact from "./models/storefront-contact"
import StorefrontSetting from "./models/storefront-setting"
import {
  normalizePriceLimits,
  resolveSettings,
  type StorefrontSettingRow,
  type StorefrontSettings,
} from "./settings-rules"

export type StoreColourValues = { name: string; hex: string }
export type StoreColourRecord = { id: string; name: string; hex: string }

// Throws when another colour has the same name. The match ignores the case and the outer spaces.
// The table has few rows, and a unique index in the database does not ignore the case. Thus the
// caller reads all rows.
function assertUniqueName(
  colours: Array<{ id: string; name: string }>,
  name: string,
  exceptId?: string
): void {
  const key = name.trim().toLowerCase()
  const duplicate = colours.some(
    (colour) => colour.id !== exceptId && colour.name.trim().toLowerCase() === key
  )
  if (duplicate) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `A colour with the name ${name} already exists.`
    )
  }
}

type StorefrontContactRow = {
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  social_links: unknown
}

// Returns the five contact fields of a row, without the id. A null social_links column gives an
// empty list, so that the callers always get a list.
function toContact(row: StorefrontContactRow): StoreContact {
  return {
    email: row.email ?? null,
    phone: row.phone ?? null,
    whatsapp: row.whatsapp ?? null,
    address: row.address ?? null,
    social_links: Array.isArray(row.social_links) ? (row.social_links as SocialLink[]) : [],
  }
}

// Reads the oldest row, so that the result stays the same if a second row exists.
const SETTINGS_ROW = { take: 1, order: { created_at: "ASC" as const } }

class StorefrontModuleService extends MedusaService({
  StorefrontSetting,
  StoreColour,
  HomeCampaign,
  StorefrontContact,
}) {
  // Returns the storefront settings. Returns the defaults for a missing row or a null field.
  async getSettings(): Promise<StorefrontSettings> {
    const [row] = await this.listStorefrontSettings({}, SETTINGS_ROW)
    return resolveSettings((row as StorefrontSettingRow | undefined) ?? null)
  }

  // Saves the storefront settings. The module keeps one settings row, so this method updates the
  // row when it exists and creates it only when there is none.
  async saveSettings(input: StorefrontSettings): Promise<StorefrontSettings> {
    const values = {
      new_badge_days: input.new_badge_days,
      low_stock_threshold: input.low_stock_threshold,
      // The generated type of a JSON field is an object, but the jsonb column also stores an
      // array.
      price_limits: normalizePriceLimits(input.price_limits) as unknown as Record<string, unknown>,
    }
    const [existing] = await this.listStorefrontSettings({}, SETTINGS_ROW)
    const row = existing
      ? await this.updateStorefrontSettings({ id: existing.id, ...values })
      : await this.createStorefrontSettings(values)
    return resolveSettings(row as StorefrontSettingRow)
  }

  // Returns the store contact. Returns the empty contact when there is no row.
  async getContact(): Promise<StoreContact> {
    const [row] = await this.listStorefrontContacts({}, SETTINGS_ROW)
    return row ? toContact(row as StorefrontContactRow) : { ...EMPTY_CONTACT, social_links: [] }
  }

  // Replaces the store contact. The module keeps one contact row, so this method updates the row
  // when it exists and creates it only when there is none.
  async setContact(input: StoreContact): Promise<StoreContact> {
    const values = {
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      address: input.address,
      // The generated type of a JSON field is an object, but the jsonb column also stores an
      // array.
      social_links: input.social_links as unknown as Record<string, unknown>,
    }
    const [existing] = await this.listStorefrontContacts({}, SETTINGS_ROW)
    const row = existing
      ? await this.updateStorefrontContacts({ id: existing.id, ...values })
      : await this.createStorefrontContacts(values)
    return toContact(row as StorefrontContactRow)
  }

  // Returns the store colours in the order of the name.
  async listColours(): Promise<StoreColourRecord[]> {
    const colours = await this.listStoreColours({}, { order: { name: "ASC" } })
    return colours.map(({ id, name, hex }) => ({ id, name, hex }))
  }

  // Creates a store colour with a trimmed name and a lower-case hex.
  async createColour(input: StoreColourValues) {
    const values = { name: input.name.trim(), hex: input.hex.toLowerCase() }
    assertUniqueName(await this.listStoreColours({}), values.name)
    return await this.createStoreColours(values)
  }

  // Updates a store colour. A colour can keep its own name in a different case.
  async updateColour(id: string, input: Partial<StoreColourValues>) {
    const colours = await this.listStoreColours({})
    if (!colours.some((colour) => colour.id === id)) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `The colour ${id} was not found.`)
    }
    const values: Partial<StoreColourValues> = {}
    if (input.name !== undefined) {
      values.name = input.name.trim()
      assertUniqueName(colours, values.name, id)
    }
    if (input.hex !== undefined) {
      values.hex = input.hex.toLowerCase()
    }
    return await this.updateStoreColours({ id, ...values })
  }

  // Returns the live home campaign, or null when no campaign is live. The unique index allows at
  // most one live row.
  async getLiveCampaign(): Promise<HomeCampaignRecord | null> {
    const [campaign] = await this.listHomeCampaigns({ status: "live" }, { take: 1 })
    return (campaign as HomeCampaignRecord | undefined) ?? null
  }

  // Ends the live home campaign. The storefront then shows no hero campaign.
  async unpublishCampaign(id: string): Promise<HomeCampaignRecord> {
    const campaign = await this.retrieveHomeCampaign(id)
    if (campaign.status !== "live") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only a live home campaign can be unpublished."
      )
    }
    return (await this.updateHomeCampaigns({
      id,
      status: "ended",
      ended_at: new Date(),
    })) as HomeCampaignRecord
  }

  // Copies the content, the images and the link of a campaign into a new draft. The copy gets no
  // id, no status and no dates of the original.
  async duplicateCampaign(id: string): Promise<HomeCampaignRecord> {
    const campaign = await this.retrieveHomeCampaign(id)
    return (await this.createHomeCampaigns({
      name: `${campaign.name} (copy)`,
      image_url: campaign.image_url,
      mobile_image_url: campaign.mobile_image_url ?? null,
      eyebrow_en: campaign.eyebrow_en ?? null,
      eyebrow_id: campaign.eyebrow_id ?? null,
      title_en: campaign.title_en,
      title_id: campaign.title_id,
      text_en: campaign.text_en ?? null,
      text_id: campaign.text_id ?? null,
      button_label_en: campaign.button_label_en,
      button_label_id: campaign.button_label_id,
      link_type: campaign.link_type,
      link_category_id: campaign.link_category_id ?? null,
      link_path: campaign.link_path ?? null,
      status: "draft",
      went_live_at: null,
      ended_at: null,
    })) as HomeCampaignRecord
  }

  // Soft-deletes a draft. Staff must unpublish a live campaign first, and an ended campaign stays
  // as a record of the past campaigns.
  async deleteDraftCampaign(id: string): Promise<void> {
    const campaign = await this.retrieveHomeCampaign(id)
    if (campaign.status !== "draft") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Only a draft home campaign can be deleted."
      )
    }
    await this.softDeleteHomeCampaigns(id)
  }
}

export default StorefrontModuleService
