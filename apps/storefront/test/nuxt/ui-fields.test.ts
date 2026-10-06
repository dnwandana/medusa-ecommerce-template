import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  FieldError, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput,
  Item, ItemContent, ItemTitle,
} from "#components"

describe("field components", () => {
  it("renders a field error as an alert", async () => {
    const wrapper = await mountSuspended(FieldError, { slots: { default: () => "Fill in this field." } })

    expect(wrapper.attributes("role")).toBe("alert")
    expect(wrapper.text()).toBe("Fill in this field.")
  })

  it("gives the input group a native input with the name and a 42px button", async () => {
    const Group = defineComponent(() => () =>
      h(InputGroup, () => [
        h(InputGroupAddon, () => "@"),
        h(InputGroupInput, { name: "email", type: "email" }),
        h(InputGroupButton, { type: "button" }, () => "Show"),
      ]))
    const wrapper = await mountSuspended(Group)

    expect(wrapper.find('input[name="email"]').attributes("type")).toBe("email")
    expect(wrapper.classes()).toContain("h-11")
    expect(wrapper.find("button").classes()).toContain("size-[42px]")
  })

  it("gives the outline item a border and radius lg", async () => {
    const Row = defineComponent(() => () =>
      h(Item, { variant: "outline" }, () => h(ItemContent, () => h(ItemTitle, () => "Plain T-Shirt"))))
    const wrapper = await mountSuspended(Row)

    expect(wrapper.classes()).toContain("border-border")
    expect(wrapper.classes()).toContain("rounded-lg")
    expect(wrapper.text()).toBe("Plain T-Shirt")
  })
})
