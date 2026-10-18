import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Badge } from "#components"
import { badgeVariants } from "~/components/ui/badge"

describe("Badge", () => {
  it("is a square caps label, 22px high", () => {
    const classes = badgeVariants().split(" ")
    expect(classes).toContain("h-[22px]")
    expect(classes).toContain("rounded-none")
    expect(classes).toContain("uppercase")
    expect(classes).toContain("tracking-[0.14em]")
  })

  it.each([
    ["sale", ["bg-sale-soft", "text-sale"]],
    ["new", ["bg-background", "text-foreground"]],
    ["low", ["bg-warning-soft", "text-warning"]],
    ["out", ["bg-primary", "text-primary-foreground"]],
    ["secondary", ["bg-secondary"]],
    ["outline", ["border", "border-foreground"]],
  ] as const)("draws the %s badge", async (variant, classes) => {
    const wrapper = await mountSuspended(Badge, {
      props: { variant },
      slots: { default: () => "Sale" },
    })
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([...classes, "uppercase", "rounded-none", "h-[22px]"])
    )
  })

  it("renders its slot text", async () => {
    const wrapper = await mountSuspended(Badge, { slots: { default: () => "3" } })
    expect(wrapper.text()).toBe("3")
  })
})
