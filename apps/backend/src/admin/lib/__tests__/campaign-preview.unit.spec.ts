import { emptyCampaignForm } from "../campaign-form"
import { heroPreview, linkSummary, splitTitle, statusText } from "../campaign-preview"

describe("campaign preview", () => {
  it("sets the words between asterisks in italics", () => {
    expect(splitTitle("Gifts in *soft* linen")).toEqual([
      { text: "Gifts in ", italic: false },
      { text: "soft", italic: true },
      { text: " linen", italic: false },
    ])
    expect(splitTitle("Save 5* today")).toEqual([{ text: "Save 5* today", italic: false }])
  })

  it("previews one language with no fallback", () => {
    const form = {
      ...emptyCampaignForm(),
      eyebrow_en: "New season",
      title_en: "Linen",
      title_id: "Linen",
      button_label_en: "Shop",
      button_label_id: "Belanja",
    }
    expect(heroPreview(form, "id")).toEqual({
      eyebrow: null,
      title: [{ text: "Linen", italic: false }],
      text: null,
      button: "Belanja",
    })
  })

  it("summarises the link", () => {
    const form = emptyCampaignForm()
    expect(linkSummary({ ...form, link_type: "category" }, "Women")).toBe("Category: Women")
    expect(linkSummary({ ...form, link_type: "category" }, null)).toBe(
      "Category: The category no longer exists."
    )
    expect(linkSummary(form, null)).toBe("All products (/products)")
    expect(linkSummary({ ...form, link_type: "path", link_path: "/about" }, null)).toBe(
      "Store path: /about"
    )
  })

  it("explains the status", () => {
    expect(statusText("draft", "Holiday 2026")).toBe(
      "Publish makes this home campaign live. The live home campaign “Holiday 2026” then changes to Ended."
    )
    expect(statusText("draft", null)).toBe("Publish makes this home campaign live.")
    expect(statusText("live", null)).toBe(
      "This home campaign is on the home page. Unpublish ends it. The home page then shows the text-only hero."
    )
    expect(statusText("ended", null)).toBe("Publish makes this home campaign live.")
  })
})
