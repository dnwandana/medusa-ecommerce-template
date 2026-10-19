import { describe, expect, it } from "vitest"
import { storefrontRouteRules } from "../../app/utils/routeRules"

const NOINDEX = { "X-Robots-Tag": "noindex" }

describe("storefrontRouteRules", () => {
  const rules = storefrontRouteRules()

  it("sends noindex on each private path and its subpaths, in the two locales", () => {
    for (const path of ["/cart", "/checkout", "/orders", "/search"]) {
      for (const key of [path, `${path}/**`, `/id${path}`, `/id${path}/**`]) {
        expect(rules[key]).toEqual({ headers: NOINDEX })
      }
    }
  })

  it("keeps the account pages client-only and adds noindex", () => {
    for (const key of ["/account", "/account/**", "/id/account", "/id/account/**"]) {
      expect(rules[key]).toEqual({ ssr: false, headers: NOINDEX })
    }
  })

  it("has no rule for a public page", () => {
    expect(rules["/products/**"]).toBeUndefined()
    expect(rules["/"]).toBeUndefined()
  })
})
