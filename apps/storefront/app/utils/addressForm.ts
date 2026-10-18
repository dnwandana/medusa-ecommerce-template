import type { HttpTypes } from "@medusajs/types"
import { isMobilePhone, isPostalCode, normalizePhone } from "./checkoutForm"
import { isProvince, toProvince } from "./provinces"

// The radio value of "Use a new address" at checkout. A Medusa address id never has this value.
export const NEW_ADDRESS = "new"

export type AddressFormValues = {
  address_name: string
  full_name: string
  phone: string
  address_1: string
  city: string
  province: string
  postal_code: string
}

export type AddressErrors = Partial<Record<keyof AddressFormValues, string>>

export type CartAddress = {
  first_name: string
  last_name: string
  address_1: string
  city: string
  province: string
  postal_code: string
  country_code: "id"
  phone: string
}

export type AddressProfile = {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
}

const REQUIRED_FIELDS: (keyof AddressFormValues)[] = [
  "full_name",
  "phone",
  "address_1",
  "city",
  "postal_code",
]

// Medusa keeps a first name and a last name. The form has one full name field.
// The words before the last space go into first_name. One word goes into first_name only.
export function splitFullName(name: string): { first_name: string; last_name: string } {
  const words = name.trim().split(/\s+/)
  if (words.length < 2) {
    return { first_name: words[0] ?? "", last_name: "" }
  }
  return { first_name: words.slice(0, -1).join(" "), last_name: words[words.length - 1]! }
}

// Returns the full name of the two Medusa parts, with no empty part.
export function joinFullName(first_name?: string | null, last_name?: string | null): string {
  return [first_name?.trim(), last_name?.trim()].filter(Boolean).join(" ")
}

// A new form starts with the name and the phone of the customer profile.
export function emptyAddressForm(profile?: AddressProfile | null): AddressFormValues {
  return {
    address_name: "",
    full_name: joinFullName(profile?.first_name, profile?.last_name),
    phone: profile?.phone ?? "",
    address_1: "",
    city: "",
    province: "",
    postal_code: "",
  }
}

// The Medusa admin can save null in each field. The form inputs need a string.
export function fromCustomerAddress(address: HttpTypes.StoreCustomerAddress): AddressFormValues {
  return {
    address_name: address.address_name ?? "",
    full_name: joinFullName(address.first_name, address.last_name),
    phone: address.phone ?? "",
    address_1: address.address_1 ?? "",
    city: address.city ?? "",
    // A province that is not in the list gives "", so the form asks for a province.
    province: toProvince(address.province),
    postal_code: address.postal_code ?? "",
  }
}

// Returns a message key for each field that is not valid. An empty object means no error.
// A guest and a customer both fill the phone of the address.
export function validateAddressForm(values: AddressFormValues): AddressErrors {
  const errors: AddressErrors = {}

  for (const field of REQUIRED_FIELDS) {
    if (!values[field].trim()) {
      errors[field] = "checkout.errors.required"
    }
  }

  // The province is a select, so an empty value gets the same error as a bad value.
  if (!isProvince(values.province)) {
    errors.province = "checkout.errors.province"
  }
  // An empty field has only the "required" error.
  if (!errors.phone && !isMobilePhone(values.phone)) {
    errors.phone = "checkout.errors.phone"
  }
  if (!errors.postal_code && !isPostalCode(values.postal_code)) {
    errors.postal_code = "checkout.errors.postalCode"
  }

  return errors
}

// Returns the non-empty lines of a textarea, trimmed. Windows browsers can send "\r\n".
function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
}

// The cart and the order show the address on one line.
export function oneLine(text: string): string {
  return lines(text).join(", ")
}

// The postal code follows the last place name with a space, as in an Indonesian address.
// The filters remove the empty parts, so that the text has no ", ," and no comma at an end.
export function addressLine(
  address: Pick<AddressFormValues, "address_1" | "city" | "province" | "postal_code">
): string {
  const place = [address.city.trim(), address.province.trim()].filter(Boolean).join(", ")
  const tail = [place, address.postal_code.trim()].filter(Boolean).join(" ")
  return [oneLine(address.address_1), tail].filter(Boolean).join(", ")
}

export function toCartAddress(values: AddressFormValues): CartAddress {
  return {
    ...splitFullName(values.full_name),
    address_1: oneLine(values.address_1),
    city: values.city.trim(),
    province: values.province.trim(),
    postal_code: values.postal_code.trim(),
    country_code: "id",
    phone: normalizePhone(values.phone),
  }
}

// The saved address keeps the line breaks, so that the edit form shows the lines again.
export function toCustomerAddressBody(
  values: AddressFormValues,
  isDefault: boolean
): HttpTypes.StoreCreateCustomerAddress {
  return {
    address_name: values.address_name.trim() || null,
    ...splitFullName(values.full_name),
    phone: normalizePhone(values.phone),
    address_1: lines(values.address_1).join("\n"),
    city: values.city.trim(),
    province: values.province.trim(),
    postal_code: values.postal_code.trim(),
    country_code: "id",
    is_default_shipping: isDefault,
  }
}

// The default address comes first, then the oldest. The copy keeps the shared state unchanged.
export function sortAddresses(
  addresses: HttpTypes.StoreCustomerAddress[]
): HttpTypes.StoreCustomerAddress[] {
  return [...addresses].sort((a, b) => {
    if (a.is_default_shipping !== b.is_default_shipping) {
      return a.is_default_shipping ? -1 : 1
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}
