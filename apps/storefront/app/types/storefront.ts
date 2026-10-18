export type StoreColour = { name: string; hex: string }

// Price limits are whole rupiah. N limits make N + 1 price ranges.
export type StorefrontSettings = {
  new_badge_days: number
  low_stock_threshold: number
  colours: StoreColour[]
  price_limits: number[]
}

// The values of the backend for a store that has no saved settings.
export const STOREFRONT_DEFAULTS: StorefrontSettings = {
  new_badge_days: 30,
  low_stock_threshold: 5,
  colours: [],
  price_limits: [],
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
