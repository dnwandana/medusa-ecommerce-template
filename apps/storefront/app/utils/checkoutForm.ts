const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// An Indonesian mobile number starts with 08, 628, or +628, and has 8 to 11 digits after the 8.
const PHONE_PATTERN = /^(\+62|62|0)8\d{8,11}$/
const POSTAL_CODE_PATTERN = /^\d{5}$/

// Returns the phone number with no spaces, hyphens, dots, or brackets.
export function normalizePhone(value: string): string {
  return value.replace(/[\s\-.()]/g, "")
}

// Mayar rejects an invoice with a mobile number that is not valid.
export function isMobilePhone(value: string): boolean {
  return PHONE_PATTERN.test(normalizePhone(value.trim()))
}

export function isPostalCode(value: string): boolean {
  return POSTAL_CODE_PATTERN.test(value.trim())
}

export type ContactValues = { email: string; phone: string }

// Returns a message key for each contact field that is not valid. An empty object means no error.
export function validateContact(
  values: ContactValues
): Partial<Record<keyof ContactValues, string>> {
  const errors: Partial<Record<keyof ContactValues, string>> = {}

  // An empty field has only the "required" error.
  if (!values.email.trim()) {
    errors.email = "checkout.errors.required"
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "checkout.errors.email"
  }
  if (!values.phone.trim()) {
    errors.phone = "checkout.errors.required"
  } else if (!isMobilePhone(values.phone)) {
    errors.phone = "checkout.errors.phone"
  }

  return errors
}

export type MayarPayer = { first_name?: string | null; last_name?: string | null }

// Mayar names the payer on the invoice, not the recipient. A profile with no first name has no
// usable payer name, so the invoice uses the name of the address.
export function toMayarCustomer(input: {
  payer: MayarPayer | null
  recipient: { first_name: string; last_name: string }
  email: string
  phone: string
}): { name: string; email: string; mobile: string } {
  const source: MayarPayer =
    input.payer && input.payer.first_name?.trim() ? input.payer : input.recipient
  // The filter removes an empty last name, so that the name has no extra space.
  const name = [source.first_name ?? "", source.last_name ?? ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")

  return {
    name,
    email: input.email.trim(),
    mobile: normalizePhone(input.phone),
  }
}
