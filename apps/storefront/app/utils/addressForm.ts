import type { HttpTypes } from "@medusajs/types"
import { isMobilePhone, isPostalCode, normalizePhone } from "./checkoutForm"

// The radio value of "Use a new address" at checkout. A Medusa address id never has this value.
export const NEW_ADDRESS = "new"

export type AddressFormValues = {
  address_name: string
  first_name: string
  last_name: string
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

const REQUIRED_FIELDS: (keyof AddressFormValues)[] = [
  "first_name",
  "last_name",
  "phone",
  "address_1",
  "city",
  "postal_code",
]

export function emptyAddressForm(): AddressFormValues {
  return {
    address_name: "",
    first_name: "",
    last_name: "",
    phone: "",
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
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    phone: address.phone ?? "",
    address_1: address.address_1 ?? "",
    city: address.city ?? "",
    province: address.province ?? "",
    postal_code: address.postal_code ?? "",
  }
}

// Returns a message key for each field that is not valid. An empty object means no error.
// The guest form has no phone field, because the Contact card has the phone.
export function validateAddressForm(
  values: AddressFormValues,
  options: { phone: boolean }
): AddressErrors {
  const errors: AddressErrors = {}

  for (const field of REQUIRED_FIELDS) {
    if (field === "phone" && !options.phone) {
      continue
    }
    if (!values[field].trim()) {
      errors[field] = "checkout.errors.required"
    }
  }

  // An empty field has only the "required" error.
  if (options.phone && !errors.phone && !isMobilePhone(values.phone)) {
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
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
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
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
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
