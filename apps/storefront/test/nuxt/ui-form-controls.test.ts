import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Checkbox, Input, Label, Textarea } from "#components"

describe("form controls", () => {
  it("draws the input as an underline on the page colour", async () => {
    const wrapper = await mountSuspended(Input)
    const input = wrapper.get("input")
    expect(input.classes()).toEqual(
      expect.arrayContaining([
        "h-12",
        "border-0",
        "border-b",
        "border-input",
        "bg-transparent",
        "rounded-none",
        "px-0",
      ])
    )
    expect(input.classes()).toContain("aria-invalid:border-destructive")
    expect(input.classes()).toContain("disabled:border-dashed")
  })

  it("draws the textarea in the same style", async () => {
    const wrapper = await mountSuspended(Textarea)
    expect(wrapper.get("textarea").classes()).toEqual(
      expect.arrayContaining([
        "border-0",
        "border-b",
        "border-input",
        "bg-transparent",
        "rounded-none",
      ])
    )
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

  it("toggles the checkbox and emits the boolean value", async () => {
    const wrapper = await mountSuspended(Checkbox, { props: { modelValue: false } })
    // The reka-ui CheckboxRoot renders a fragment, so the wrapper root is not the control.
    const box = wrapper.find('[role="checkbox"]')

    await box.trigger("click")

    expect(box.exists()).toBe(true)
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true])
  })
})
