import { describe, expect, it } from "vitest"
import { PROVINCES, isProvince, toProvince } from "../../app/utils/provinces"

describe("provinces", () => {
  it("has the 38 provinces with no duplicate", () => {
    expect(PROVINCES).toHaveLength(38)
    expect(new Set(PROVINCES).size).toBe(38)
    expect(PROVINCES[0]).toBe("Aceh")
    expect(PROVINCES).toContain("Papua Barat Daya")
  })

  it("accepts a province name with any case and extra spaces", () => {
    expect(isProvince(" dki jakarta ")).toBe(true)
    expect(isProvince("Jakarta")).toBe(false)
    expect(isProvince("")).toBe(false)
    expect(isProvince(null)).toBe(false)
  })

  it("gives the list name for a saved province", () => {
    expect(toProvince("jawa barat")).toBe("Jawa Barat")
    expect(toProvince("West Java")).toBe("")
    expect(toProvince(undefined)).toBe("")
  })
})
