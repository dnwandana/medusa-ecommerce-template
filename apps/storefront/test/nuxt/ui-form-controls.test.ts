import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Input, Label, Textarea } from "#components"

describe("form controls", () => {
  it("gives the input a height of 44px, the input border, and 16px text", async () => {
    const wrapper = await mountSuspended(Input, { props: { modelValue: "" } })
    const classes = wrapper.classes()

    expect(classes).toContain("h-11")
    expect(classes).toContain("border-input")
    expect(classes).toContain("rounded-md")
    expect(classes).toContain("text-base")
    expect(classes).not.toContain("md:text-sm")
    expect(classes).toContain("aria-invalid:border-destructive")
  })

  it("gives the textarea a minimum height of 112px", async () => {
    const wrapper = await mountSuspended(Textarea, { props: { modelValue: "" } })

    expect(wrapper.classes()).toContain("min-h-28")
    expect(wrapper.classes()).toContain("border-input")
  })

  it("gives the label 14/20 text with weight 600", async () => {
    const wrapper = await mountSuspended(Label, { slots: { default: () => "Email address" } })

    expect(wrapper.classes()).toContain("text-body-sm")
    expect(wrapper.classes()).toContain("font-semibold")
  })

  it("keeps the v-model of the input", async () => {
    const wrapper = await mountSuspended(Input, { props: { modelValue: "a" } })
    await wrapper.setValue("b")

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual(["b"])
  })
})
