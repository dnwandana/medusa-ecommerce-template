import { formatWibTime } from "../templates/html"

describe("formatWibTime", () => {
  it("writes the time in WIB with a 24-hour clock", () => {
    expect(formatWibTime(new Date("2026-10-18T07:30:00Z"))).toBe("18 October 2026, 14:30 WIB")
    expect(formatWibTime(new Date("2026-10-17T17:05:00Z"))).toBe("18 October 2026, 00:05 WIB")
  })

  it("writes a one-digit day with no leading zero", () => {
    expect(formatWibTime(new Date("2026-11-01T13:00:00Z"))).toBe("1 November 2026, 20:00 WIB")
  })
})
