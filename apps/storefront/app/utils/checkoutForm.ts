const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// An Indonesian mobile number starts with 08, 628, or +628, and has 8 to 11 digits after the 8.
const PHONE_PATTERN = /^(\+62|62|0)8\d{8,11}$/
const POSTAL_CODE_PATTERN = /^\d{5}$/

// Returns the phone number with no spaces, hyphens, dots, or brackets.
export function normalizePhone(value: string): string {
  return value.replace(/[\s\-.()]/g, "")
}

// Couriers call or message the recipient, so the checkout accepts only a mobile number.
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

export type PaymentPayer = { first_name?: string | null; last_name?: string | null }

export type PaymentCustomer = {
  first_name: string
  last_name: string
  email: string
  phone: string
}

// Returns an Indonesian mobile number in the E.164 format, for example +6281234567890.
// Payment providers expect one format, and the customer can type 08, 628, or +628.
export function toE164(phone: string): string {
  return normalizePhone(phone.trim()).replace(/^(\+62|62|0)/, "+62")
}

// Returns the customer object that the checkout sends to each payment provider. A provider names
// the payer, not the recipient. A profile with no first name has no usable payer name, so the
// object uses the name of the address.
export function toPaymentCustomer(input: {
  payer: PaymentPayer | null
  recipient: { first_name: string; last_name: string }
  email: string
  phone: string
}): PaymentCustomer {
  const source: PaymentPayer =
    input.payer && input.payer.first_name?.trim() ? input.payer : input.recipient

  return {
    first_name: (source.first_name ?? "").trim(),
    // A profile can have a null last name. The object always has a string.
    last_name: (source.last_name ?? "").trim(),
    email: input.email.trim(),
    phone: toE164(input.phone),
  }
}
