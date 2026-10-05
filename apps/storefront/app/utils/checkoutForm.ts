export type CheckoutFormValues = {
  email: string
  phone: string
  first_name: string
  last_name: string
  address_1: string
  city: string
  province: string
  postal_code: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// An Indonesian mobile number starts with 08, 628, or +628, and has 8 to 11 digits after the 8.
const PHONE_PATTERN = /^(\+62|62|0)8\d{8,11}$/
const POSTAL_CODE_PATTERN = /^\d{5}$/

const REQUIRED_FIELDS: (keyof CheckoutFormValues)[] = [
  "email",
  "phone",
  "first_name",
  "last_name",
  "address_1",
  "city",
  "postal_code",
]

// Returns the phone number with no spaces, hyphens, dots, or brackets.
export function normalizePhone(value: string): string {
  return value.replace(/[\s\-.()]/g, "")
}

// Returns a message key for each field that is not valid. An empty object means no error.
export function validateCheckoutForm(
  values: CheckoutFormValues
): Partial<Record<keyof CheckoutFormValues, string>> {
  const errors: Partial<Record<keyof CheckoutFormValues, string>> = {}

  for (const field of REQUIRED_FIELDS) {
    if (!values[field].trim()) {
      errors[field] = "checkout.errors.required"
    }
  }

  // An empty field has only the "required" error.
  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "checkout.errors.email"
  }
  // Mayar rejects an invoice with a mobile number that is not valid.
  if (!errors.phone && !PHONE_PATTERN.test(normalizePhone(values.phone.trim()))) {
    errors.phone = "checkout.errors.phone"
  }
  if (!errors.postal_code && !POSTAL_CODE_PATTERN.test(values.postal_code.trim())) {
    errors.postal_code = "checkout.errors.postalCode"
  }

  return errors
}

// Returns the customer data that the Mayar payment session needs.
export function toMayarCustomer(values: CheckoutFormValues): {
  name: string
  email: string
  mobile: string
} {
  return {
    name: `${values.first_name.trim()} ${values.last_name.trim()}`,
    email: values.email.trim(),
    mobile: normalizePhone(values.phone),
  }
}
