import { buildSessionOptions } from "../session"

const HOUR = 60 * 60 * 1000

describe("buildSessionOptions", () => {
  it("gives a rolling session of 168 hours when SESSION_TTL_HOURS is absent or empty", () => {
    expect(buildSessionOptions({})).toEqual({ ttl: 168 * HOUR, rolling: true })
    expect(buildSessionOptions({ SESSION_TTL_HOURS: "" })).toEqual({
      ttl: 168 * HOUR,
      rolling: true,
    })
  })

  it("reads the hours from SESSION_TTL_HOURS", () => {
    expect(buildSessionOptions({ SESSION_TTL_HOURS: "12" })).toEqual({
      ttl: 12 * HOUR,
      rolling: true,
    })
  })

  it.each(["0", "-1", "1.5", "abc", " 12", "12h"])("stops the start for %p", (value) => {
    expect(() => buildSessionOptions({ SESSION_TTL_HOURS: value })).toThrow(/SESSION_TTL_HOURS/)
  })
})
