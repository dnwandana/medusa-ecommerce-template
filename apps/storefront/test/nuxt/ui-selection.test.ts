import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  RadioGroup,
  RadioGroupItem,
  ToggleGroup,
  ToggleGroupItem,
} from "#components"

describe("selection components", () => {
  it("gives the radio group a native input with the name", async () => {
    // reka-ui renders the native input only inside a form, as on the checkout page.
    const Group = defineComponent(
      () => () =>
        h(
          "form",
          h(RadioGroup, { name: "shipping_option", modelValue: "so_1" }, () => [
            h(RadioGroupItem, { value: "so_1" }),
            h(RadioGroupItem, { value: "so_2" }),
          ])
        )
    )
    const wrapper = await mountSuspended(Group)

    expect(wrapper.findAll('[role="radio"]')).toHaveLength(2)
    expect(wrapper.find('input[name="shipping_option"]').exists()).toBe(true)
  })

  it("shows the on style for the selected toggle item", async () => {
    const Group = defineComponent(
      () => () =>
        h(ToggleGroup, { type: "single", modelValue: "M" }, () => [
          h(ToggleGroupItem, { value: "S" }, () => "S"),
          h(ToggleGroupItem, { value: "M" }, () => "M"),
        ])
    )
    const wrapper = await mountSuspended(Group)
    const on = wrapper.findAll("button").find((button) => button.text() === "M")!

    expect(on.attributes("data-state")).toBe("on")
    expect(on.classes()).toContain("data-[state=on]:bg-primary-soft")
    expect(on.classes()).toContain("h-11")
  })

  it("keeps the closed content in the DOM with unmount-on-hide false", async () => {
    const Box = defineComponent(
      () => () =>
        h(Collapsible, { unmountOnHide: false }, () => [
          h(CollapsibleTrigger, () => "Write a review"),
          h(CollapsibleContent, () => h("form", { "data-testid": "inner" })),
        ])
    )
    const wrapper = await mountSuspended(Box)

    expect(wrapper.find('[data-testid="inner"]').exists()).toBe(true)
  })
})
