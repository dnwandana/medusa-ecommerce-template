import { describe, expect, it } from "vitest"
import {
  normalizePhone,
  toMayarCustomer,
  validateCheckoutForm,
} from "../../app/utils/checkoutForm"

const valid = {
  email: "buyer@example.com",
  phone: "081234567890",
  first_name: "Sari",
  last_name: "Dewi",
  address_1: "Jl. Merdeka No. 1",
  city: "Bandung",
  province: "Jawa Barat",
  postal_code: "40111",
}

describe("normalizePhone", () => {
  it("removes spaces, hyphens, dots, and brackets", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("+6281234567890")
    expect(normalizePhone(" (0812) 3456.7890 ")).toBe("081234567890")
  })
})

describe("validateCheckoutForm", () => {
  it("accepts a complete form", () => {
    expect(validateCheckoutForm(valid)).toEqual({})
  })

  it("accepts a form with no province", () => {
    expect(validateCheckoutForm({ ...valid, province: "" })).toEqual({})
  })

  // Review Focus: the phone number goes to Mayar. A wrong form must stop before the invoice.
  it("accepts an Indonesian mobile number in each usual form", () => {
    for (const phone of ["081234567890", "+6281234567890", "6281234567890", "+62 812-3456-7890"]) {
      expect(validateCheckoutForm({ ...valid, phone })).toEqual({})
    }
  })

  // Review Focus: letters, a short number, and a number that is not a mobile number.
  it("rejects a phone number that is not an Indonesian mobile number", () => {
    for (const phone of ["08abc", "12345", "0812345", "+15551234567", "0211234567", "08123456789012345"]) {
      expect(validateCheckoutForm({ ...valid, phone })).toEqual({ phone: "checkout.errors.phone" })
    }
  })

  it("rejects an email address that is not valid", () => {
    expect(validateCheckoutForm({ ...valid, email: "buyer.example.com" })).toEqual({
      email: "checkout.errors.email",
    })
  })

  it("rejects a postal code that does not have 5 digits", () => {
    for (const postal_code of ["4011", "401111", "4011a"]) {
      expect(validateCheckoutForm({ ...valid, postal_code })).toEqual({
        postal_code: "checkout.errors.postalCode",
      })
    }
  })

  it("reports each empty field that is necessary", () => {
    expect(
      validateCheckoutForm({
        email: "",
        phone: " ",
        first_name: "",
        last_name: "",
        address_1: "",
        city: "",
        province: "",
        postal_code: "",
      })
    ).toEqual({
      email: "checkout.errors.required",
      phone: "checkout.errors.required",
      first_name: "checkout.errors.required",
      last_name: "checkout.errors.required",
      address_1: "checkout.errors.required",
      city: "checkout.errors.required",
      postal_code: "checkout.errors.required",
    })
  })
})

describe("toMayarCustomer", () => {
  // Review Focus: Mayar gets the clean number, not the text that the customer typed.
  it("builds the customer data with the full name and the clean number", () => {
    expect(toMayarCustomer({ ...valid, phone: "+62 812-3456-7890", first_name: " Sari " })).toEqual({
      name: "Sari Dewi",
      email: "buyer@example.com",
      mobile: "+6281234567890",
    })
  })
})
