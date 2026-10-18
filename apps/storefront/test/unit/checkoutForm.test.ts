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
  const recipient = { first_name: " Sari ", last_name: "Dewi", phone: "0812-3456-7890" }

  it("uses the recipient name, the clean email, and the E.164 phone for a guest", () => {
    expect(
      toPaymentCustomer({
        payer: null,
        recipient,
        email: " buyer@example.com ",
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
      }).first_name
    ).toBe("Sari")
  })

  it("gives an empty last name, not null, for a profile with no last name", () => {
    expect(
      toPaymentCustomer({
        payer: { first_name: "Budi", last_name: null },
        recipient,
        email: "a@b.co",
      }).last_name
    ).toBe("")
  })

  it("uses the profile phone of a signed-in customer", () => {
    expect(
      toPaymentCustomer({
        payer: { first_name: "Sari", last_name: "Wulandari", phone: "0812-3456-7890" },
        recipient: { first_name: "Budi", last_name: "Santoso", phone: "081398765432" },
        email: "sari@example.com",
      }).phone
    ).toBe("+6281234567890")
  })

  it("uses the address phone when the profile has no mobile number", () => {
    const recipient = { first_name: "Budi", last_name: "Santoso", phone: "081398765432" }
    expect(
      toPaymentCustomer({ payer: { first_name: "Sari", phone: null }, recipient, email: "a@b.co" })
        .phone
    ).toBe("+6281398765432")
    expect(
      toPaymentCustomer({
        payer: { first_name: "Sari", phone: "0215551234" },
        recipient,
        email: "a@b.co",
      }).phone
    ).toBe("+6281398765432")
    expect(toPaymentCustomer({ payer: null, recipient, email: "a@b.co" }).phone).toBe(
      "+6281398765432"
    )
  })
})

describe("validateContact", () => {
  it("checks only the email of the contact", () => {
    expect(validateContact({ email: "" })).toEqual({ email: "checkout.errors.required" })
    expect(validateContact({ email: "sari@" })).toEqual({ email: "checkout.errors.email" })
    expect(validateContact({ email: " sari@example.com " })).toEqual({})
  })
})
