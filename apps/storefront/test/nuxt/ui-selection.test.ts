import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  Checkbox,
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

  it("draws the checkbox as an 18 px square in ink", async () => {
    const wrapper = await mountSuspended(Checkbox, { props: { modelValue: true } })
    const box = wrapper.get("button")
    expect(box.classes()).toEqual(
      expect.arrayContaining([
        "size-[18px]",
        "rounded-none",
        "border-foreground",
        "data-[state=checked]:bg-primary",
      ])
    )
  })

  it("draws the radio as an 18 px circle in ink", async () => {
    const wrapper = await mountSuspended(RadioGroup, {
      props: { modelValue: "a" },
      slots: { default: () => h(RadioGroupItem, { value: "a" }) },
    })
    const item = wrapper.get("button")
    expect(item.classes()).toEqual(
      expect.arrayContaining(["size-[18px]", "rounded-full", "border-foreground"])
    )
    expect(wrapper.find("[data-slot='radio-group-indicator'] span").classes()).toContain(
      "bg-primary"
    )
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
