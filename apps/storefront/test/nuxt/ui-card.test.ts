import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "#components"

describe("Card", () => {
  it("has a border, radius lg, and no ring or shadow", async () => {
    const wrapper = await mountSuspended(Card, { slots: { default: () => "Body" } })
    const classes = wrapper.classes()

    expect(classes).toContain("border")
    expect(classes).toContain("border-border")
    expect(classes).toContain("rounded-lg")
    expect(classes).not.toContain("ring-1")
    expect(classes.some((name) => name.startsWith("shadow"))).toBe(false)
    expect(classes).not.toContain("py-4")
  })

  it("gives the title the h3 type and the description the small type", async () => {
    const title = await mountSuspended(CardTitle, { slots: { default: () => "Summary" } })
    const description = await mountSuspended(CardDescription, { slots: { default: () => "Text" } })

    expect(title.classes()).toContain("text-h3")
    expect(description.classes()).toContain("text-body-sm")
    expect(description.classes()).toContain("text-muted-foreground")
  })
})

describe("Card sections", () => {
  it.each([
    [CardHeader, ["px-4", "pt-4", "md:px-6", "md:pt-6"]],
    [CardContent, ["p-4", "md:p-6"]],
    [CardFooter, ["px-4", "pb-4", "md:px-6", "md:pb-6"]],
  ])("gives the section a padding of 24px, or 16px below md", async (component, expected) => {
    const wrapper = await mountSuspended(component, { slots: { default: () => "Part" } })

    for (const name of expected) {
      expect(wrapper.classes()).toContain(name)
    }
  })

  it("gives the footer no background and no top border", async () => {
    const wrapper = await mountSuspended(CardFooter, { slots: { default: () => "Part" } })

    expect(wrapper.classes()).not.toContain("bg-muted/50")
    expect(wrapper.classes()).not.toContain("border-t")
  })
})
