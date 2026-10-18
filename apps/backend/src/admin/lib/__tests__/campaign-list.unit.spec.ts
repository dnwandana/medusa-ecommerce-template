import {
  campaignActions,
  campaignErrorText,
  campaignListQuery,
  campaignStatusBadge,
  DELETE_PROMPT,
  formatCampaignDate,
  publishPrompt,
  UNPUBLISH_PROMPT,
} from "../campaign-list"

describe("campaign list", () => {
  it("makes the list query", () => {
    expect(campaignListQuery(2, "all", "  ")).toEqual({ limit: 20, offset: 40 })
    expect(campaignListQuery(0, "live", " holiday ")).toEqual({
      limit: 20,
      offset: 0,
      status: "live",
      q: "holiday",
    })
  })

  it("gives the badge of each status", () => {
    expect(campaignStatusBadge("draft")).toEqual({ color: "grey", label: "Draft" })
    expect(campaignStatusBadge("live")).toEqual({ color: "green", label: "Live" })
    expect(campaignStatusBadge("ended")).toEqual({ color: "grey", label: "Ended" })
  })

  it("gives the row actions of each status", () => {
    expect(campaignActions("draft")).toEqual(["edit", "publish", "duplicate", "delete"])
    expect(campaignActions("live")).toEqual(["edit", "unpublish", "duplicate"])
    expect(campaignActions("ended")).toEqual(["edit", "publish", "duplicate"])
  })

  it("formats a date", () => {
    expect(formatCampaignDate("2026-10-18T09:00:00.000Z")).toBe("18 Oct 2026")
    expect(formatCampaignDate(null)).toBe("-")
  })

  it("names the live campaign in the publish prompt", () => {
    expect(publishPrompt("Holiday 2026")).toEqual({
      title: "Publish this home campaign?",
      description:
        "The live home campaign “Holiday 2026” changes to Ended. This home campaign then shows on the home page.",
    })
    expect(publishPrompt(null).description).toBe("This home campaign then shows on the home page.")
  })

  it("has the unpublish and delete prompts", () => {
    expect(UNPUBLISH_PROMPT).toEqual({
      title: "Unpublish this home campaign?",
      description:
        "The home campaign changes to Ended. The home page shows the text-only hero until you publish a home campaign.",
    })
    expect(DELETE_PROMPT).toEqual({
      title: "Delete this home campaign?",
      description: "The home campaign leaves the list. The history keeps the record.",
    })
  })

  it("shows the message of a 400 answer and a fallback for other errors", () => {
    const invalid = Object.assign(new Error("Select a category that exists."), { status: 400 })
    const failed = Object.assign(new Error("Internal error"), { status: 500 })
    expect(campaignErrorText(invalid, "Try again.")).toBe("Select a category that exists.")
    expect(campaignErrorText(failed, "Try again.")).toBe("Try again.")
    expect(campaignErrorText("boom", "Try again.")).toBe("Try again.")
  })
})
