import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import QuantityStepper from "~/components/QuantityStepper.vue"

describe("QuantityStepper", () => {
  it("names the two buttons and emits the new value", async () => {
    const wrapper = await mountSuspended(QuantityStepper, { props: { modelValue: 2 } })
    const [minus, plus] = wrapper.findAll("button")
    expect(minus!.attributes("aria-label")).toBe("Decrease the quantity")
    expect(plus!.attributes("aria-label")).toBe("Increase the quantity")
    await plus!.trigger("click")
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([3])
    await minus!.trigger("click")
    expect(wrapper.emitted("update:modelValue")?.[1]).toEqual([1])
  })

  it("disables minus at the minimum and plus at the maximum", async () => {
    const wrapper = await mountSuspended(QuantityStepper, { props: { modelValue: 1, max: 1 } })
    const [minus, plus] = wrapper.findAll("button")
    expect(minus!.attributes("disabled")).toBeDefined()
    expect(plus!.attributes("disabled")).toBeDefined()
  })

  it("draws one bordered control", async () => {
    const wrapper = await mountSuspended(QuantityStepper, { props: { modelValue: 1 } })
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(["inline-flex", "border", "border-border"])
    )
    expect(wrapper.get("[aria-live='polite']").text()).toBe("1")
  })
})
