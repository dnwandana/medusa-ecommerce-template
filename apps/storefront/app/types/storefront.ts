export type StoreColour = { name: string; hex: string }

// The network is an id of SOCIAL_NETWORKS in app/utils/socialNetworks.ts.
export type SocialLink = { network: string; url: string }

// The contact of the store. A field with no value is null, and the storefront does not show it.
export type StoreContact = {
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  social_links: SocialLink[]
}

// Price limits are whole rupiah. N limits make N + 1 price ranges.
export type StorefrontSettings = {
  new_badge_days: number
  low_stock_threshold: number
  colours: StoreColour[]
  price_limits: number[]
  contact: StoreContact
}

// The values of the backend for a store that has no saved settings.
export const STOREFRONT_DEFAULTS: StorefrontSettings = {
  new_badge_days: 30,
  low_stock_threshold: 5,
  colours: [],
  price_limits: [],
  contact: { email: null, phone: null, whatsapp: null, address: null, social_links: [] },
}

export type HomeCampaign = {
  id: string
  image_url: string
  mobile_image_url: string | null
  eyebrow: string | null
  title: string
  text: string | null
  button_label: string
  link: string
}
