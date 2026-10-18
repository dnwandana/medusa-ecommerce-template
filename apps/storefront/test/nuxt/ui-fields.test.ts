import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import {
  FieldError,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Item,
  ItemContent,
  ItemTitle,
} from "#components"

describe("field components", () => {
  it("renders a field error as an alert", async () => {
    const wrapper = await mountSuspended(FieldError, {
      slots: { default: () => "Fill in this field." },
    })

    expect(wrapper.attributes("role")).toBe("alert")
    expect(wrapper.text()).toBe("Fill in this field.")
  })

  it("shows the label in the caps field style", async () => {
    const wrapper = await mountSuspended(FieldLabel, { slots: { default: () => "Email address" } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["text-field-label", "uppercase"]))
    expect(wrapper.text()).toBe("Email address")
  })

  it("shows the error with the circle-alert icon", async () => {
    const wrapper = await mountSuspended(FieldError, {
      slots: { default: () => "Fill in this field." },
    })
    expect(wrapper.attributes("role")).toBe("alert")
    expect(wrapper.find("svg.lucide-circle-alert").exists()).toBe(true)
    expect(wrapper.find("svg").attributes("aria-hidden")).toBe("true")
    expect(wrapper.classes()).toContain("text-destructive")
  })

  it("gives the input group a native input with the name and a 42px button", async () => {
    const Group = defineComponent(
      () => () =>
        h(InputGroup, () => [
          h(InputGroupAddon, () => "@"),
          h(InputGroupInput, { name: "email", type: "email" }),
          h(InputGroupButton, { type: "button" }, () => "Show"),
        ])
    )
    const wrapper = await mountSuspended(Group)

    expect(wrapper.find('input[name="email"]').attributes("type")).toBe("email")
    expect(wrapper.classes()).toContain("h-11")
    expect(wrapper.find("button").classes()).toContain("size-[42px]")
  })

  it("gives the outline item a border and radius lg", async () => {
    const Row = defineComponent(
      () => () =>
        h(Item, { variant: "outline" }, () =>
          h(ItemContent, () => h(ItemTitle, () => "Plain T-Shirt"))
        )
    )
    const wrapper = await mountSuspended(Row)

    expect(wrapper.classes()).toContain("border-border")
    expect(wrapper.classes()).toContain("rounded-lg")
    expect(wrapper.text()).toBe("Plain T-Shirt")
  })
})
