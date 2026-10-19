import { describe, expect, it } from "vitest"
import { robotsTxt } from "../../server/utils/robots"

describe("robotsTxt", () => {
  it("blocks the filter and sort parameters and names the sitemap", () => {
    expect(robotsTxt("https://shop.example/")).toBe(
      [
        "User-agent: *",
        "Disallow: /*?*size=",
        "Disallow: /*?*colour=",
        "Disallow: /*?*fabric=",
        "Disallow: /*?*price=",
        "Disallow: /*?*sort=",
        "",
        "Sitemap: https://shop.example/sitemap.xml",
        "",
      ].join("\n")
    )
  })

  it("does not block the private pages, because they send noindex", () => {
    expect(robotsTxt("https://shop.example")).not.toMatch(
      /Disallow: \/(id\/)?(cart|checkout|account|orders|search)/
    )
  })
})
