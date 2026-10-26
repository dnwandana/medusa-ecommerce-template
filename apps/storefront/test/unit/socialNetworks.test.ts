import { describe, expect, it } from "vitest"
import { SOCIAL_NETWORKS, socialNetwork } from "../../app/utils/socialNetworks"

describe("socialNetworks", () => {
  it("has the same 14 ids as the backend, in the same order", () => {
    expect(SOCIAL_NETWORKS.map((n) => n.id)).toEqual([
      "instagram",
      "tiktok",
      "facebook",
      "x",
      "youtube",
      "threads",
      "pinterest",
      "linkedin",
      "telegram",
      "line",
      "shopee",
      "tokopedia",
      "lazada",
      "amazon",
    ])
  })

  it("gives each network a name and an SVG path", () => {
    for (const n of SOCIAL_NETWORKS) {
      expect(n.name).not.toBe("")
      expect(n.path).toMatch(/^M/)
    }
  })

  it("finds a network by id and returns undefined for an unknown id", () => {
    expect(socialNetwork("line")?.name).toBe("LINE")
    expect(socialNetwork("myspace")).toBeUndefined()
  })
})
