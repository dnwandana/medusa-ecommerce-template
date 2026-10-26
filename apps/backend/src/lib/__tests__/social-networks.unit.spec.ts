import { isAllowedSocialUrl, knownSocialLinks, SOCIAL_NETWORK_IDS } from "../social-networks"

describe("social networks", () => {
  it("lists the 14 networks in the fixed order", () => {
    expect(SOCIAL_NETWORK_IDS).toEqual([
      "instagram",
      "tiktok",
      "facebook",
      "x",
      "youtube",
      "threads",
      "pinterest",
      "linkedin",
      "telegram",
      "line",
      "shopee",
      "tokopedia",
      "lazada",
      "amazon",
    ])
  })

  it.each([
    ["instagram", "https://www.instagram.com/store", true],
    ["instagram", "https://instagram.com/store", true],
    ["instagram", "http://instagram.com/store", false],
    ["instagram", "https://evilinstagram.com/store", false],
    ["instagram", "https://instagram.com.evil.io/store", false],
    ["x", "https://twitter.com/store", true],
    ["line", "https://lin.ee/abc", true],
    ["shopee", "https://shopee.co.id/store", true],
    ["tokopedia", "https://www.tokopedia.com/store", true],
    ["myspace", "https://myspace.com/store", false],
    ["instagram", "not a url", false],
  ])("isAllowedSocialUrl(%s, %s) is %s", (network, url, expected) => {
    expect(isAllowedSocialUrl(network, url)).toBe(expected)
  })

  it("keeps only the links of a known network, in order", () => {
    expect(
      knownSocialLinks([
        { network: "tiktok", url: "https://tiktok.com/@a" },
        { network: "myspace", url: "https://myspace.com/a" },
        { network: "instagram", url: "https://instagram.com/a" },
      ])
    ).toEqual([
      { network: "tiktok", url: "https://tiktok.com/@a" },
      { network: "instagram", url: "https://instagram.com/a" },
    ])
  })
})
