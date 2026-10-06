import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Badge } from "#components"
import { badgeVariants } from "~/components/ui/badge"

describe("Badge", () => {
  it("is a pill, 20px high", () => {
    const classes = badgeVariants().split(" ")
    expect(classes).toContain("h-5")
    expect(classes).toContain("min-w-5")
    expect(classes).toContain("rounded-full")
  })

  it("has a dot form for the cart count", () => {
    expect(badgeVariants({ variant: "dot" })).toContain("absolute")
  })

  it("renders its slot text", async () => {
    const wrapper = await mountSuspended(Badge, { slots: { default: () => "3" } })
    expect(wrapper.text()).toBe("3")
  })
})
