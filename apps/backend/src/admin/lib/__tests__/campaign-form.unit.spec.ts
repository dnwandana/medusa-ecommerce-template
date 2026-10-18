import {
  emptyCampaignForm,
  tabsWithErrors,
  toCampaignForm,
  toCampaignPayload,
  validateCampaignForm,
} from "../campaign-form"

const filled = {
  ...emptyCampaignForm(),
  name: "Holiday 2026",
  image_url: "https://assets.example.com/holiday.jpg",
  title_en: "Gifts in *soft* linen",
  title_id: "Hadiah dari linen yang *lembut*",
  button_label_en: "Shop the gifts",
  button_label_id: "Belanja hadiah",
}

describe("campaign form", () => {
  it("accepts a filled form", () => {
    expect(validateCampaignForm(filled)).toEqual({})
  })

  it("gives the message of each missing field", () => {
    expect(validateCampaignForm(emptyCampaignForm())).toEqual({
      name: "Enter a name.",
      title_en: "Enter a title.",
      title_id: "Enter a title.",
      button_label_en: "Enter a button label.",
      button_label_id: "Enter a button label.",
      image_url: "Upload an image.",
    })
  })

  it("checks the link of its type only", () => {
    expect(validateCampaignForm({ ...filled, link_type: "category" })).toEqual({
      link_category_id: "Select a category.",
    })
    expect(validateCampaignForm({ ...filled, link_type: "path", link_path: "about" })).toEqual({
      link_path: "Enter a path that starts with /.",
    })
    expect(
      validateCampaignForm({ ...filled, link_type: "path", link_path: "//evil.example.com" })
    ).toEqual({ link_path: "Enter a path that starts with /." })
    expect(
      validateCampaignForm({ ...filled, link_type: "all_products", link_path: "about" })
    ).toEqual({})
  })

  it("checks only the fields of one section", () => {
    const form = { ...emptyCampaignForm(), name: "Holiday 2026" }
    expect(validateCampaignForm(form, ["image_url", "mobile_image_url"])).toEqual({
      image_url: "Upload an image.",
    })
  })

  it("marks the language tabs that have an error", () => {
    expect(tabsWithErrors({ title_id: "Enter a title." })).toEqual(["id"])
    expect(tabsWithErrors({ name: "Enter a name." })).toEqual([])
    expect(tabsWithErrors({ link_category_id: "Select a category." })).toEqual([])
    expect(tabsWithErrors({ button_label_id: "x", title_en: "x" })).toEqual(["en", "id"])
  })

  it("sends blank optional fields as null and trims the rest", () => {
    const payload = toCampaignPayload({ ...filled, name: "  Holiday 2026 ", eyebrow_en: "  " })
    expect(payload).toMatchObject({
      name: "Holiday 2026",
      eyebrow_en: null,
      mobile_image_url: null,
    })
  })

  it("turns a saved campaign into a form", () => {
    const form = toCampaignForm({
      ...filled,
      id: "hcmp_1",
      status: "draft",
      mobile_image_url: null,
      eyebrow_en: null,
      eyebrow_id: null,
      text_en: null,
      text_id: null,
      link_category_id: null,
      link_path: null,
      went_live_at: null,
      ended_at: null,
      created_at: "2026-10-18T00:00:00.000Z",
      updated_at: "2026-10-18T00:00:00.000Z",
    })
    expect(form).toEqual({ ...filled, link_type: "all_products" })
  })
})
