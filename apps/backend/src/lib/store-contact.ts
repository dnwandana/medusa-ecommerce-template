// The rules of the store contact. The admin route, the admin form, and the storefront settings
// route use them, so the three apply the same limits.

export type SocialLink = { network: string; url: string }

export type StoreContact = {
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  social_links: SocialLink[]
}

// E.164: "+", then 8 to 15 digits, and the first digit is not 0. The rule does not add a country
// code to a local number, because the backend does not know the country of the store.
export const E164_PATTERN = /^\+[1-9]\d{7,14}$/

export const ADDRESS_MAX_LENGTH = 500
export const SOCIAL_LINKS_MAX = 10

export const NUMBER_ERROR = "Start with + and the country code, for example +62 812 3456 7890."

export const EMPTY_CONTACT: StoreContact = {
  email: null,
  phone: null,
  whatsapp: null,
  address: null,
  social_links: [],
}
