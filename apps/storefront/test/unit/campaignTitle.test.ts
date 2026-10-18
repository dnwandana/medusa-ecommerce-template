import { describe, expect, it } from "vitest"
import { campaignTitleParts } from "~/utils/campaignTitle"

describe("campaignTitleParts", () => {
  it("makes the words between asterisks italic", () => {
    expect(campaignTitleParts("The *linen* edit")).toEqual([
      { text: "The ", italic: false },
      { text: "linen", italic: true },
      { text: " edit", italic: false },
    ])
  })

  it("keeps an asterisk with no pair", () => {
    expect(campaignTitleParts("Sale * now")).toEqual([{ text: "Sale * now", italic: false }])
  })

  it("accepts more than one italic part", () => {
    expect(campaignTitleParts("*Soft* and *light*").map((part) => part.italic)).toEqual([
      true,
      false,
      true,
    ])
  })

  it("keeps the third asterisk of an odd count as text", () => {
    expect(campaignTitleParts("*New* in * stock")).toEqual([
      { text: "New", italic: true },
      { text: " in * stock", italic: false },
    ])
  })

  it("keeps two asterisks with nothing between them as text", () => {
    expect(campaignTitleParts("Sale ** now")).toEqual([{ text: "Sale ** now", italic: false }])
  })

  it("gives no part for an empty title", () => {
    expect(campaignTitleParts("")).toEqual([])
  })
})
