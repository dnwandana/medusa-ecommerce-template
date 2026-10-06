import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Button } from "#components"
import { buttonVariants } from "~/components/ui/button"

describe("shadcn-vue Button", () => {
  it("renders a button with its slot text", async () => {
    const wrapper = await mountSuspended(Button, { slots: { default: () => "Add to cart" } })

    expect(wrapper.element.tagName).toBe("BUTTON")
    expect(wrapper.text()).toBe("Add to cart")
  })

  it.each([
    ["sm", "h-9"],
    ["default", "h-11"],
    ["lg", "h-13"],
    ["icon", "size-11"],
    ["icon-sm", "size-9"],
  ] as const)("gives the %s size the class %s", (size, height) => {
    expect(buttonVariants({ size }).split(" ")).toContain(height)
  })

  it("uses primary-hover for the hover of the default variant", () => {
    expect(buttonVariants()).toContain("hover:bg-primary-hover")
  })

  it("uses the disabled tokens and no opacity for the disabled state", () => {
    const classes = buttonVariants()
    expect(classes).toContain("disabled:bg-disabled")
    expect(classes).toContain("disabled:text-disabled-foreground")
    expect(classes).not.toContain("disabled:opacity-50")
  })

  it("gives a current item the primary-soft style", () => {
    const classes = buttonVariants({ variant: "outline" })
    expect(classes).toContain("aria-[current=page]:bg-primary-soft")
    expect(classes).toContain("data-[state=on]:bg-primary-soft")
  })

  it("has no secondary variant", () => {
    // @ts-expect-error The design has no secondary button.
    expect(buttonVariants({ variant: "secondary" })).not.toContain("bg-secondary")
  })
})
