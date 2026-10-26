import { isAllowedSocialUrl, SOCIAL_NETWORKS } from "../../lib/social-networks"
import {
  ADDRESS_MAX_LENGTH,
  E164_PATTERN,
  NUMBER_ERROR,
  type SocialLink,
  type StoreContact,
} from "../../lib/store-contact"

// The form keeps an empty string for an empty field, because an input needs a string value.
export type ContactForm = { email: string; phone: string; whatsapp: string; address: string }

// A loose check. POST /admin/store-contact does the full check and the drawer shows its error.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns the form values of the saved contact. */
export function toContactForm(contact: StoreContact): ContactForm {
  return {
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    whatsapp: contact.whatsapp ?? "",
    address: contact.address ?? "",
  }
}

/** Returns the number without spaces, dashes, and brackets. */
export function cleanNumber(value: string): string {
  return value.replace(/[\s\-()[\]]/g, "")
}

/**
 * Returns the number in the E.164 format, or the trimmed value when the clean number fails the
 * rule. The function never adds a country code, because the admin does not know the country.
 */
function toNumber(value: string): string {
  const cleaned = cleanNumber(value)
  return E164_PATTERN.test(cleaned) ? cleaned : value
}

/** Returns an error text for each field that POST /admin/store-contact does not accept. */
export function validateContactForm(form: ContactForm): Partial<Record<keyof ContactForm, string>> {
  const errors: Partial<Record<keyof ContactForm, string>> = {}
  const email = form.email.trim()
  if (email && !EMAIL.test(email)) {
    errors.email = "Enter a valid email address."
  }
  for (const field of ["phone", "whatsapp"] as const) {
    const value = form[field].trim()
    if (value && !E164_PATTERN.test(cleanNumber(value))) {
      errors[field] = NUMBER_ERROR
    }
  }
  if (form.address.trim().length > ADDRESS_MAX_LENGTH) {
    errors.address = `Enter ${ADDRESS_MAX_LENGTH} characters or fewer.`
  }
  return errors
}

/**
 * Returns the body of POST /admin/store-contact. The route accepts null, not an empty string. The
 * route replaces the whole contact, so the body always has the links.
 */
export function toContactPayload(form: ContactForm, links: SocialLink[]): StoreContact {
  const email = form.email.trim()
  const phone = form.phone.trim()
  const whatsapp = form.whatsapp.trim()
  const address = form.address.trim()
  return {
    email: email || null,
    phone: phone ? toNumber(phone) : null,
    whatsapp: whatsapp ? toNumber(whatsapp) : null,
    address: address || null,
    social_links: links.map((link) => ({ network: link.network, url: link.url.trim() })),
  }
}

/** Returns the display name of the network, or the id when the list does not have the network. */
export function socialNetworkName(id: string): string {
  return SOCIAL_NETWORKS.find((network) => network.id === id)?.name ?? id
}

/** Returns the error text of a link that the route does not accept, else null. */
export function validateSocialLink(link: SocialLink): string | null {
  return isAllowedSocialUrl(link.network, link.url.trim())
    ? null
    : `Enter an https link to ${socialNetworkName(link.network)}.`
}

/**
 * Returns a new list in which the link changes places with the link above or below it. A move
 * past the end of the list returns the same order.
 */
export function moveLink(
  links: SocialLink[],
  index: number,
  direction: "up" | "down"
): SocialLink[] {
  const moved = [...links]
  const to = direction === "up" ? index - 1 : index + 1
  if (index < 0 || index >= links.length || to < 0 || to >= links.length) {
    return moved
  }
  ;[moved[index], moved[to]] = [moved[to], moved[index]]
  return moved
}
