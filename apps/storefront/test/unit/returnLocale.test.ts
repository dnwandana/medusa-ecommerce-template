import { describe, expect, it } from "vitest"
import { resolveReturnLocale } from "../../app/utils/returnLocale"

const codes = ["en", "id"]

describe("resolveReturnLocale", () => {
  // Review Focus: the return URL has no locale prefix. The cookie gives the locale.
  it("returns the locale of the cookie", () => {
    expect(resolveReturnLocale("id", codes, "en")).toBe("id")
    expect(resolveReturnLocale("en", codes, "en")).toBe("en")
  })

  it("returns the fallback when there is no cookie", () => {
    expect(resolveReturnLocale(undefined, codes, "en")).toBe("en")
    expect(resolveReturnLocale(null, codes, "en")).toBe("en")
    expect(resolveReturnLocale("", codes, "en")).toBe("en")
  })

  it("returns the fallback for a value that is not a locale code", () => {
    expect(resolveReturnLocale("fr", codes, "en")).toBe("en")
    expect(resolveReturnLocale("//evil.example", codes, "en")).toBe("en")
  })
})
