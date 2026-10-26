import { ADDRESS_MAX_LENGTH, E164_PATTERN, EMPTY_CONTACT, SOCIAL_LINKS_MAX } from "../store-contact"

describe("store contact rules", () => {
  it.each(["+6281234567890", "+12025550123", "+60123456789"])("accepts %s", (value) =>
    expect(E164_PATTERN.test(value)).toBe(true)
  )

  it.each(["081234567890", "+0812345678", "+62 812", "6281234567890", "+1234567"])(
    "rejects %s",
    (value) => expect(E164_PATTERN.test(value)).toBe(false)
  )

  it("has the limits and the empty contact of the spec", () => {
    expect(ADDRESS_MAX_LENGTH).toBe(500)
    expect(SOCIAL_LINKS_MAX).toBe(10)
    expect(EMPTY_CONTACT).toEqual({
      email: null,
      phone: null,
      whatsapp: null,
      address: null,
      social_links: [],
    })
  })
})
