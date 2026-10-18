import {
  campaignLocale,
  isStorePath,
  localizeCampaign,
  resolveCampaignLink,
  validateCampaignForPublish,
} from "../campaign-rules"

const content = {
  id: "hcmp_1",
  image_url: "https://assets.example.com/holiday.jpg",
  mobile_image_url: null,
  eyebrow_en: "Holiday 2026",
  eyebrow_id: null,
  title_en: "Gifts in *soft* linen",
  title_id: "Hadiah dari linen yang *lembut*",
  text_en: "Linen and wool pieces.",
  text_id: "Linen dan wol.",
  button_label_en: "Shop the gifts",
  button_label_id: "Belanja hadiah",
  link_type: "all_products" as const,
  link_category_id: null,
  link_path: null,
}

describe("campaign rules", () => {
  it.each([
    ["/products/linen-shirt", true],
    ["/", true],
    ["products", false],
    ["//evil.example.com", false],
    ["/a b", false],
    ["/x://y", false],
  ])("checks the store path %s", (path, expected) => {
    expect(isStorePath(path)).toBe(expected)
  })

  it("resolves each link type", () => {
    const category = { link_type: "category" as const, link_category_id: "pcat_1", link_path: null }
    expect(resolveCampaignLink(category, "women")).toBe("/categories/women")
    expect(resolveCampaignLink(category, null)).toBe("/products")
    expect(resolveCampaignLink(content, null)).toBe("/products")
    expect(
      resolveCampaignLink({ link_type: "path", link_category_id: null, link_path: "/about" }, null)
    ).toBe("/about")
    expect(
      resolveCampaignLink({ link_type: "path", link_category_id: null, link_path: "//x" }, null)
    ).toBe("/products")
  })

  it("blocks the publish of a campaign whose category no longer exists", () => {
    const link = { link_type: "category" as const, link_category_id: "pcat_1", link_path: null }
    expect(validateCampaignForPublish(link, { categoryExists: false })).toBe(
      "The link category no longer exists. Select another category, then publish."
    )
    expect(validateCampaignForPublish(link, { categoryExists: true })).toBeNull()
  })

  it("picks the locale from the header", () => {
    expect(campaignLocale("id-ID")).toBe("id")
    expect(campaignLocale("en-US")).toBe("en")
    expect(campaignLocale(undefined)).toBe("en")
  })

  it("gives the Bahasa Indonesia values and no English fallback", () => {
    expect(localizeCampaign(content, "id", "/products")).toEqual({
      id: "hcmp_1",
      image_url: "https://assets.example.com/holiday.jpg",
      mobile_image_url: null,
      eyebrow: null,
      title: "Hadiah dari linen yang *lembut*",
      text: "Linen dan wol.",
      button_label: "Belanja hadiah",
      link: "/products",
    })
  })
})
