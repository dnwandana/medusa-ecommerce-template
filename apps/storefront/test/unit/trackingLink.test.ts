import { describe, expect, it } from "vitest"
import { safeTrackingUrl } from "~/utils/trackingLink"

describe("safeTrackingUrl", () => {
  it("keeps an https URL", () => {
    expect(safeTrackingUrl("https://track.example.com/JP1")).toBe("https://track.example.com/JP1")
  })

  it("trims the spaces around the URL", () => {
    expect(safeTrackingUrl("  https://track.example.com/JP1 ")).toBe(
      "https://track.example.com/JP1"
    )
  })

  it.each([
    [null],
    [undefined],
    [""],
    ["#"],
    ["http://track.example.com/JP1"],
    ["javascript:alert(1)"],
    ["JavaScript:alert(1)"],
    [" javascript:alert(1)"],
    ["data:text/html,hi"],
    ["track.example.com/JP1"],
    ["//track.example.com/JP1"],
  ])("refuses %s", (url) => {
    expect(safeTrackingUrl(url)).toBeNull()
  })
})
