import { describe, expect, it } from "vitest"
import { cn } from "../../app/lib/utils"

describe("cn", () => {
  it.each([
    "text-display",
    "text-h1",
    "text-h2",
    "text-h3",
    "text-h4",
    "text-body-lg",
    "text-body-sm",
    "text-caption",
    "text-price",
    "text-price-lg",
  ])("keeps %s next to a text colour", (type) => {
    expect(cn(type, "text-muted-foreground")).toBe(`${type} text-muted-foreground`)
    expect(cn("text-primary-foreground", type)).toBe(`text-primary-foreground ${type}`)
  })

  it("lets a later type utility replace an earlier one", () => {
    expect(cn("text-body-sm", "text-caption")).toBe("text-caption")
    expect(cn("text-sm", "text-h4")).toBe("text-h4")
  })
})
