import { escapeHtml, formatRupiah, formatWibDate, formatWibTime } from "../templates/html"

const date = new Date("2026-10-21T07:30:00Z")
describe("formatWibTime", () => {
  it("formats English with a colon", () => {
    expect(formatWibTime(date, "en-US")).toBe("21 October 2026, 14:30 WIB")
  })
  it("formats Indonesian with a dot", () => {
    expect(formatWibTime(date, "id-ID")).toBe("21 Oktober 2026, 14.30 WIB")
  })
  it("defaults to English", () => {
    expect(formatWibTime(date)).toBe("21 October 2026, 14:30 WIB")
  })
  it("has no leading zero on the day", () => {
    expect(formatWibTime(new Date("2026-10-02T01:05:00Z"), "en-US")).toBe(
      "2 October 2026, 08:05 WIB"
    )
  })
})
describe("formatWibDate", () => {
  it("formats both locales", () => {
    expect([formatWibDate(date, "en-US"), formatWibDate(date, "id-ID")]).toEqual([
      "21 October 2026",
      "21 Oktober 2026",
    ])
  })
})
describe("helpers", () => {
  it("escapes and formats", () => {
    expect([escapeHtml("<a&\"'>"), formatRupiah(150000), formatRupiah("x")]).toEqual([
      "&lt;a&amp;&quot;&#39;&gt;",
      "Rp 150.000",
      "Rp 0",
    ])
  })
})

// These cases came from password-reset.unit.spec.ts. They test the shared helpers, so they live
// with the helpers.
describe("formatWibTime at the day boundary", () => {
  it("moves the day to WIB", () => {
    expect(formatWibTime(new Date("2026-10-17T17:05:00Z"), "en-US")).toBe(
      "18 October 2026, 00:05 WIB"
    )
    expect(formatWibTime(new Date("2026-10-17T17:05:00Z"), "id-ID")).toBe(
      "18 Oktober 2026, 00.05 WIB"
    )
    expect(formatWibDate(new Date("2026-10-17T17:05:00Z"), "id-ID")).toBe("18 Oktober 2026")
  })
})

describe("escapeHtml", () => {
  it("escapes the five HTML characters", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;"
    )
  })

  it("returns an empty string for null and undefined", () => {
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
  })
})

describe("formatRupiah", () => {
  it("formats whole rupiah with dots and no decimals", () => {
    expect(formatRupiah(150000)).toBe("Rp 150.000")
    expect(formatRupiah(1500000)).toBe("Rp 1.500.000")
    expect(formatRupiah(500)).toBe("Rp 500")
    expect(formatRupiah(0)).toBe("Rp 0")
  })

  it("accepts a numeric string and an object with valueOf", () => {
    expect(formatRupiah("20000")).toBe("Rp 20.000")
    expect(formatRupiah({ valueOf: () => 85000 })).toBe("Rp 85.000")
  })

  it("returns Rp 0 for a value that is not a number", () => {
    expect(formatRupiah(undefined)).toBe("Rp 0")
    expect(formatRupiah("abc")).toBe("Rp 0")
  })
})
