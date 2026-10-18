import { describe, expect, it } from "vitest"
import { relativeTime } from "~/utils/relativeTime"

const NOW = new Date("2026-10-18T12:00:00Z")

describe("relativeTime", () => {
  it("gives the time since the date in words", () => {
    expect(relativeTime("2026-10-18T08:00:00Z", "en", NOW)).toBe("today")
    expect(relativeTime("2026-10-15T12:00:00Z", "en", NOW)).toBe("3 days ago")
    expect(relativeTime("2026-10-04T12:00:00Z", "en", NOW)).toBe("2 weeks ago")
    expect(relativeTime("2026-09-10T12:00:00Z", "en", NOW)).toBe("1 month ago")
    expect(relativeTime("2024-10-01T12:00:00Z", "en", NOW)).toBe("2 years ago")
  })

  it("uses the locale", () => {
    expect(relativeTime("2026-10-04T12:00:00Z", "id", NOW)).toBe("2 minggu yang lalu")
  })

  it("accepts a Date and gives today for a date in the future", () => {
    expect(relativeTime(new Date("2026-10-19T12:00:00Z"), "en", NOW)).toBe("today")
  })
})
