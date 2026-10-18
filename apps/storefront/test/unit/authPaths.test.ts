import { describe, expect, it } from "vitest"
import { SIGN_IN_PATH, signInTarget } from "../../app/utils/authPaths"

describe("SIGN_IN_PATH", () => {
  it("signs in on the magic link page", () => {
    expect(SIGN_IN_PATH).toBe("/account/sign-in")
  })
})

describe("signInTarget", () => {
  it("keeps the target path in the redirect query", () => {
    expect(signInTarget("/account/orders")).toEqual({
      path: SIGN_IN_PATH,
      query: { redirect: "/account/orders" },
    })
  })

  it("has no redirect query without a target", () => {
    expect(signInTarget()).toEqual({ path: SIGN_IN_PATH, query: {} })
    expect(signInTarget("")).toEqual({ path: SIGN_IN_PATH, query: {} })
  })
})
