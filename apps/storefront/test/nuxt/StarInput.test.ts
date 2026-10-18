import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import StarInput from "~/components/StarInput.vue"

describe("StarInput", () => {
  it("renders five named radios in 44 px targets", async () => {
    const wrapper = await mountSuspended(StarInput, { props: { modelValue: 0, name: "rating" } })
    const radios = wrapper.findAll("input[type='radio']")
    expect(radios).toHaveLength(5)
    expect(radios[2]!.attributes("aria-label")).toBe("3 of 5 stars")
    expect(radios[2]!.attributes("name")).toBe("rating")
    expect(wrapper.findAll("label")[0]!.classes()).toContain("size-11")
  })

  it("emits the value and fills the stars up to it", async () => {
    const wrapper = await mountSuspended(StarInput, { props: { modelValue: 4, name: "rating" } })
    expect(wrapper.findAll("svg.fill-star")).toHaveLength(4)
    await wrapper.findAll("input")[1]!.setValue(true)
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([2])
  })

  it("marks the radios as invalid", async () => {
    const wrapper = await mountSuspended(StarInput, {
      props: { modelValue: 0, name: "rating", invalid: true },
    })
    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true")
  })
})
