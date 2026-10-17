import { describe, expect, it } from "vitest"
import { normalizePhone, toMayarCustomer, validateContact } from "../../app/utils/checkoutForm"

describe("normalizePhone", () => {
  it("removes spaces, hyphens, dots, and brackets", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("+6281234567890")
    expect(normalizePhone(" (0812) 3456.7890 ")).toBe("081234567890")
  })
})

describe("toMayarCustomer", () => {
  const recipient = { first_name: " Sari ", last_name: "Dewi" }

  // Review Focus: Mayar gets the clean number, not the text that the customer typed.
  it("uses the recipient name and the clean number for a guest", () => {
    expect(
      toMayarCustomer({
        payer: null,
        recipient,
        email: " buyer@example.com ",
        phone: "+62 812-3456-7890",
      })
    ).toEqual({
      name: "Sari Dewi",
      email: "buyer@example.com",
      mobile: "+6281234567890",
    })
  })

  it("uses the profile name of the payer", () => {
    expect(
      toMayarCustomer({
        payer: { first_name: "Budi", last_name: "Santoso" },
        recipient,
        email: "member@example.com",
        phone: "081298765432",
      }).name
    ).toBe("Budi Santoso")
  })

  // Review Focus: a profile with no name gives the name of the address.
  it("uses the recipient name when the profile has no first name", () => {
    expect(
      toMayarCustomer({
        payer: { first_name: " ", last_name: null },
        recipient,
        email: "member@example.com",
        phone: "081298765432",
      }).name
    ).toBe("Sari Dewi")
  })

  it("gives a name with no extra space when there is no last name", () => {
    expect(
      toMayarCustomer({
        payer: { first_name: "Budi", last_name: null },
        recipient,
        email: "member@example.com",
        phone: "081298765432",
      }).name
    ).toBe("Budi")
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
