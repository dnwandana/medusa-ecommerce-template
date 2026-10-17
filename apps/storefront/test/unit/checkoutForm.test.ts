import { describe, expect, it } from "vitest"
import {
  normalizePhone,
  toE164,
  toPaymentCustomer,
  validateContact,
} from "../../app/utils/checkoutForm"

describe("normalizePhone", () => {
  it("removes spaces, hyphens, dots, and brackets", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("+6281234567890")
    expect(normalizePhone(" (0812) 3456.7890 ")).toBe("081234567890")
  })
})

describe("toE164", () => {
  it("writes each accepted form as +62", () => {
    expect(toE164("081234567890")).toBe("+6281234567890")
    expect(toE164("6281234567890")).toBe("+6281234567890")
    expect(toE164("+62 812-3456-7890")).toBe("+6281234567890")
  })
})

describe("toPaymentCustomer", () => {
  const recipient = { first_name: " Sari ", last_name: "Dewi" }

  it("uses the recipient name, the clean email, and the E.164 phone for a guest", () => {
    expect(
      toPaymentCustomer({
        payer: null,
        recipient,
        email: " buyer@example.com ",
        phone: "0812-3456-7890",
      })
    ).toEqual({
      first_name: "Sari",
      last_name: "Dewi",
      email: "buyer@example.com",
      phone: "+6281234567890",
    })
  })

  it("uses the profile name of a logged-in customer", () => {
    expect(
      toPaymentCustomer({
        payer: { first_name: "Budi", last_name: "Santoso" },
        recipient,
        email: "member@example.com",
        phone: "081298765432",
      })
    ).toMatchObject({ first_name: "Budi", last_name: "Santoso" })
  })

  // Review Focus: a profile with no first name gives the name of the address.
  it("uses the recipient name when the profile has no first name", () => {
    expect(
      toPaymentCustomer({
        payer: { first_name: " ", last_name: "X" },
        recipient,
        email: "a@b.co",
        phone: "081298765432",
      }).first_name
    ).toBe("Sari")
  })

  it("gives an empty last name, not null, for a profile with no last name", () => {
    expect(
      toPaymentCustomer({
        payer: { first_name: "Budi", last_name: null },
        recipient,
        email: "a@b.co",
        phone: "081298765432",
      }).last_name
    ).toBe("")
  })
})

describe("validateContact", () => {
  it("requires the email and the phone", () => {
    expect(validateContact({ email: "", phone: "" })).toEqual({
      email: "checkout.errors.required",
      phone: "checkout.errors.required",
    })
  })

  it("rejects an email with no domain and a phone that is not a mobile number", () => {
    expect(validateContact({ email: "buyer@", phone: "0212345678" })).toEqual({
      email: "checkout.errors.email",
      phone: "checkout.errors.phone",
    })
  })

  it("accepts a valid email and a mobile number with spaces and hyphens", () => {
    expect(validateContact({ email: "buyer@example.com", phone: "+62 812-3456-7890" })).toEqual({})
  })
})
