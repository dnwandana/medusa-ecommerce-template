// The rules for the home campaigns. This file has no Medusa import, so that the Store route, the
// Admin routes and the tests share one copy.

export type CampaignLocale = "en" | "id"

export type CampaignLink = {
  link_type: "category" | "all_products" | "path"
  link_category_id: string | null
  link_path: string | null
}

export type CampaignContent = CampaignLink & {
  id: string
  image_url: string
  mobile_image_url: string | null
  eyebrow_en: string | null
  eyebrow_id: string | null
  title_en: string
  title_id: string
  text_en: string | null
  text_id: string | null
  button_label_en: string
  button_label_id: string
}

// The campaign as the storefront gets it: the values of one locale and a resolved link.
export type StoreHomeCampaign = {
  id: string
  image_url: string
  mobile_image_url: string | null
  eyebrow: string | null
  title: string
  text: string | null
  button_label: string
  link: string
}

// The link of a campaign that has no valid target. It always stays in the store.
const FALLBACK_LINK = "/products"

// Returns true for a path in the store, for example "/products/linen-shirt". A path that starts
// with "//" or contains "://" or "\" can open another site, so it is not a store path.
export function isStorePath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/\s/.test(value) &&
    !value.includes("\\") &&
    !value.includes("://")
  )
}

// Returns the message that stops the publish, or null when the campaign can go live.
export function validateCampaignForPublish(
  campaign: CampaignLink,
  context: { categoryExists: boolean }
): string | null {
  if (campaign.link_type === "category") {
    if (!campaign.link_category_id) {
      return "Select a link category, then publish."
    }
    if (!context.categoryExists) {
      return "The link category no longer exists. Select another category, then publish."
    }
  }
  if (campaign.link_type === "path" && !isStorePath(campaign.link_path ?? "")) {
    return "The link path is not a store path. Type a path that starts with /, then publish."
  }
  return null
}

// Returns the link of the campaign button, with no locale prefix. The storefront adds the prefix.
// A deleted category or a bad path gives the product list, so the link never leaves the store.
export function resolveCampaignLink(link: CampaignLink, categoryHandle: string | null): string {
  if (link.link_type === "category") {
    return categoryHandle ? `/categories/${categoryHandle}` : FALLBACK_LINK
  }
  if (link.link_type === "path" && link.link_path && isStorePath(link.link_path)) {
    return link.link_path
  }
  return FALLBACK_LINK
}

// Returns the campaign locale for the x-medusa-locale header. English is the default.
export function campaignLocale(header: string | undefined): CampaignLocale {
  return header === "id-ID" || header === "id" ? "id" : "en"
}

// Returns null for an empty or blank value.
function optional(value: string | null): string | null {
  return value && value.trim() !== "" ? value : null
}

// Returns the campaign in one locale. An optional field with no value in the locale is null. It
// does not take the English value, because a mix of two languages on one hero reads badly. The
// title keeps its asterisks. The storefront shows the marked words in italics.
export function localizeCampaign(
  campaign: CampaignContent,
  locale: CampaignLocale,
  link: string
): StoreHomeCampaign {
  const isId = locale === "id"
  return {
    id: campaign.id,
    image_url: campaign.image_url,
    mobile_image_url: optional(campaign.mobile_image_url),
    eyebrow: optional(isId ? campaign.eyebrow_id : campaign.eyebrow_en),
    title: isId ? campaign.title_id : campaign.title_en,
    text: optional(isId ? campaign.text_id : campaign.text_en),
    button_label: isId ? campaign.button_label_id : campaign.button_label_en,
    link,
  }
}
