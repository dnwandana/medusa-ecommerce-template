import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "../../app/utils/safeRedirect"

describe("safeRedirectPath", () => {
  it("accepts a path of the storefront", () => {
    expect(safeRedirectPath("/account/orders", "/account")).toBe("/account/orders")
    expect(safeRedirectPath("/id/products/plain-t-shirt?size=m", "/account")).toBe(
      "/id/products/plain-t-shirt?size=m"
    )
  })

  // Review Focus: the login page must not send the customer to a different site.
  it("rejects an address of a different site", () => {
    expect(safeRedirectPath("https://evil.example", "/account")).toBe("/account")
    expect(safeRedirectPath("//evil.example", "/account")).toBe("/account")
    expect(safeRedirectPath("/\\evil.example", "/account")).toBe("/account")
    expect(safeRedirectPath("javascript:alert(1)", "/account")).toBe("/account")
  })

  it("rejects a value that is not a path", () => {
    expect(safeRedirectPath(undefined, "/account")).toBe("/account")
    expect(safeRedirectPath("", "/account")).toBe("/account")
    expect(safeRedirectPath("account", "/account")).toBe("/account")
    expect(safeRedirectPath(["/a", "/b"], "/id/account")).toBe("/id/account")
  })
})
