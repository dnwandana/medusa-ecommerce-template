import { NUMBER_ERROR } from "../../../lib/store-contact"
import {
  cleanNumber,
  moveLink,
  socialNetworkName,
  toContactForm,
  toContactPayload,
  validateContactForm,
  validateSocialLink,
} from "../store-contact-form"

describe("toContactForm", () => {
  it("shows null as an empty field", () => {
    expect(
      toContactForm({
        email: "store@example.com",
        phone: null,
        whatsapp: "+6281234567890",
        address: null,
        social_links: [],
      })
    ).toEqual({ email: "store@example.com", phone: "", whatsapp: "+6281234567890", address: "" })
  })
})

describe("cleanNumber", () => {
  // Review Focus: the owner pastes a number with spaces, dashes, or brackets.
  it.each([
    ["+62 812-3456-7890", "+6281234567890"],
    ["(+62) 812 3456 7890", "+6281234567890"],
  ])("cleanNumber(%s) is %s", (input, output) => expect(cleanNumber(input)).toBe(output))
})

describe("validateContactForm", () => {
  it("returns no errors for an empty form", () => {
    expect(validateContactForm({ email: "", phone: "", whatsapp: "", address: "" })).toEqual({})
  })

  // Review Focus: the owner types a local number.
  it("rejects a local number and never adds +62", () => {
    const form = { email: "", phone: "0215550100", whatsapp: "081234567890", address: "" }
    expect(validateContactForm(form)).toEqual({ phone: NUMBER_ERROR, whatsapp: NUMBER_ERROR })
    expect(toContactPayload(form, []).whatsapp).toBe("081234567890")
  })

  it("rejects an email address with no domain", () => {
    expect(validateContactForm({ email: "store@", phone: "", whatsapp: "", address: "" })).toEqual({
      email: "Enter a valid email address.",
    })
  })

  it("rejects an address longer than 500 characters", () => {
    expect(
      validateContactForm({ email: "", phone: "", whatsapp: "", address: "a".repeat(501) })
    ).toHaveProperty("address")
  })
})

describe("toContactPayload", () => {
  it("sends null for an empty field and keeps the address line breaks", () => {
    expect(
      toContactPayload(
        { email: " ", phone: "", whatsapp: "+60 12 345 6789", address: "Jl. A 1\nJakarta" },
        []
      )
    ).toEqual({
      email: null,
      phone: null,
      whatsapp: "+60123456789",
      address: "Jl. A 1\nJakarta",
      social_links: [],
    })
  })

  it("sends the links in their order", () => {
    const links = [
      { network: "x", url: "https://x.com/a" },
      { network: "line", url: "https://lin.ee/b" },
    ]
    expect(
      toContactPayload({ email: "", phone: "", whatsapp: "", address: "" }, links).social_links
    ).toEqual(links)
  })
})

describe("validateSocialLink", () => {
  it("checks a link against its network", () => {
    expect(validateSocialLink({ network: "instagram", url: "https://instagram.com/a" })).toBeNull()
    expect(validateSocialLink({ network: "instagram", url: "https://tiktok.com/@a" })).toBe(
      "Enter an https link to Instagram."
    )
  })
})

describe("moveLink", () => {
  it("moves a link one place and ignores a move past the end", () => {
    const links = [
      { network: "x", url: "https://x.com/a" },
      { network: "line", url: "https://lin.ee/b" },
    ]
    expect(moveLink(links, 1, "up")).toEqual([links[1], links[0]])
    expect(moveLink(links, 1, "down")).toEqual(links)
  })

  it("does not change the list that it gets", () => {
    const links = [
      { network: "x", url: "https://x.com/a" },
      { network: "line", url: "https://lin.ee/b" },
    ]
    const copy = [...links]
    moveLink(links, 0, "down")
    expect(links).toEqual(copy)
  })
})

describe("socialNetworkName", () => {
  it("returns the display name, or the id of an unknown network", () => {
    expect(socialNetworkName("tiktok")).toBe("TikTok")
    expect(socialNetworkName("myspace")).toBe("myspace")
  })
})
