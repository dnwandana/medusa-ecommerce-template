import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { h } from "vue"
import RadioRow from "~/components/RadioRow.vue"
import { RadioGroup } from "~/components/ui/radio-group"

const group = (modelValue: string, single = false) =>
  mountSuspended(RadioGroup, {
    props: { modelValue },
    slots: {
      default: () => [
        h(
          RadioRow,
          { value: "std", title: "Standard Shipping", aside: "Rp 18.000", single },
          () => "Hint"
        ),
        ...(single ? [] : [h(RadioRow, { value: "exp", title: "Express", aside: "Free" })]),
      ],
    },
  })

describe("RadioRow", () => {
  it("makes the full row the target and shows the aside text", async () => {
    const wrapper = await group("std")
    const row = wrapper.findAll("label")[0]!
    expect(row.text()).toContain("Standard Shipping")
    expect(row.text()).toContain("Rp 18.000")
    expect(row.classes()).toContain("min-h-16")
    expect(row.find("button[role='radio']").exists()).toBe(true)
    // The hairline is under the row and its slot, so the slot belongs to the row above the line.
    expect(wrapper.findAll("[data-slot='radio-row']")[0]!.classes()).toEqual(
      expect.arrayContaining(["border-b", "border-border"])
    )
  })

  it("shows the slot only under the selected row", async () => {
    const wrapper = await group("exp")
    expect(wrapper.text()).not.toContain("Hint")
  })

  it("shows one row with no radio when single is set", async () => {
    const wrapper = await group("std", true)
    expect(wrapper.find("button[role='radio']").exists()).toBe(false)
    expect(wrapper.text()).toContain("Hint")
  })

  it("links the label to the radio of the row", async () => {
    // happy-dom does not forward a label click to a button, so the test checks the link.
    const wrapper = await group("std")
    const row = wrapper.findAll("label")[1]!
    const radio = row.get("button[role='radio']")
    expect(row.attributes("for")).toBe(radio.attributes("id"))
    await radio.trigger("click")
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["exp"])
  })

  it("uses the title and caption slots when they are given", async () => {
    const wrapper = await mountSuspended(RadioGroup, {
      props: { modelValue: "a" },
      slots: {
        default: () =>
          h(
            RadioRow,
            { value: "a", title: "Rumah" },
            {
              title: () => h("span", { class: "slot-title" }, "Rumah · Default"),
              caption: () => h("span", { class: "slot-caption" }, "Two lines"),
            }
          ),
      },
    })
    expect(wrapper.get(".slot-title").text()).toBe("Rumah · Default")
    expect(wrapper.get(".slot-caption").text()).toBe("Two lines")
  })
})
