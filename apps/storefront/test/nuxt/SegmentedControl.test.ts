import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import SegmentedControl from "~/components/SegmentedControl.vue"

const options = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
]

describe("SegmentedControl", () => {
  it("marks the selected segment", async () => {
    const wrapper = await mountSuspended(SegmentedControl, {
      props: { modelValue: "en", options, label: "Language" },
    })
    expect(wrapper.attributes("aria-label")).toBe("Language")
    const [english, indonesian] = wrapper.findAll("button")
    expect(english!.attributes("data-state")).toBe("on")
    expect(indonesian!.attributes("data-state")).toBe("off")
    expect(english!.classes()).toContain("min-h-11")
  })

  it("emits the new value and never an empty value", async () => {
    const wrapper = await mountSuspended(SegmentedControl, {
      props: { modelValue: "en", options, label: "Language" },
    })
    await wrapper.findAll("button")[1]!.trigger("click")
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["id"])
    await wrapper.findAll("button")[0]!.trigger("click")
    await wrapper.findAll("button")[0]!.trigger("click")
    expect(wrapper.emitted("update:modelValue")?.flat()).not.toContain("")
  })
})
