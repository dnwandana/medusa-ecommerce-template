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
    ["sm", "h-10"],
    ["default", "h-12"],
    ["lg", "h-14"],
    ["icon", "size-11"],
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

  it("uses ink for the default variant and an ink rule for outline", async () => {
    const solid = await mountSuspended(Button, { slots: { default: () => "Add to cart" } })
    expect(solid.classes()).toEqual(
      expect.arrayContaining(["bg-primary", "h-12", "text-button", "uppercase"])
    )
    const outline = await mountSuspended(Button, {
      props: { variant: "outline" },
      slots: { default: () => "Edit" },
    })
    expect(outline.classes()).toEqual(expect.arrayContaining(["border", "border-foreground"]))
  })

  it("has the light variant and the sizes 40, 48 and 56", async () => {
    // The preview gives the light variant an ivory rule, filled with ivory on hover.
    const light = await mountSuspended(Button, { props: { variant: "light" } })
    expect(light.classes()).toEqual(
      expect.arrayContaining(["border-background", "hover:bg-background"])
    )
    expect((await mountSuspended(Button, { props: { size: "sm" } })).classes()).toContain("h-10")
    expect((await mountSuspended(Button, { props: { size: "lg" } })).classes()).toContain("h-14")
    expect((await mountSuspended(Button, { props: { size: "icon" } })).classes()).toContain(
      "size-11"
    )
  })

  it("keeps the width and shows a spinner while it loads", async () => {
    const wrapper = await mountSuspended(Button, {
      props: { loading: true },
      slots: { default: () => "Place order" },
    })
    expect(wrapper.attributes("aria-busy")).toBe("true")
    expect(wrapper.attributes("disabled")).toBeDefined()
    expect(wrapper.find("[data-slot='button-label']").classes()).toContain("invisible")
    expect(wrapper.find("[data-slot='spinner']").exists()).toBe(true)
  })

  it("keeps the accessible name while it loads", async () => {
    const wrapper = await mountSuspended(Button, {
      props: { loading: true },
      slots: { default: () => "Place order" },
    })
    const label = wrapper.get("[data-slot='button-label']")
    expect(label.text()).toBe("Place order")
    expect(wrapper.attributes("aria-labelledby")).toBe(label.attributes("id"))
  })

  it("keeps the name from aria-label while it loads", async () => {
    const wrapper = await mountSuspended(Button, {
      props: { loading: true },
      attrs: { "aria-label": "Remove" },
    })
    expect(wrapper.attributes("aria-labelledby")).toBeUndefined()
  })

  it("has no busy state and no hidden label when it does not load", async () => {
    const wrapper = await mountSuspended(Button, { slots: { default: () => "Add to cart" } })
    expect(wrapper.attributes("aria-busy")).toBeUndefined()
    expect(wrapper.attributes("disabled")).toBeUndefined()
    expect(wrapper.find("[data-slot='button-label']").exists()).toBe(false)
  })
})
