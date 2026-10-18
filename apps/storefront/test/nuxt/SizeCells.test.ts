import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import SizeCells from "~/components/SizeCells.vue"

const sizes = [
  { value: "S", soldOut: false },
  { value: "M", soldOut: true },
  { value: "L", soldOut: false },
]

describe("SizeCells", () => {
  it("renders a 48 px cell for each size", async () => {
    const wrapper = await mountSuspended(SizeCells, {
      props: { modelValue: null, sizes, label: "Size", soldOutLabel: "Sold out" },
    })
    expect(wrapper.get("[role='radiogroup']").attributes("aria-label")).toBe("Size")
    const cells = wrapper.findAll("[role='radio']")
    expect(cells).toHaveLength(3)
    expect(cells[0]!.classes()).toContain("h-12")
  })

  it("does not select a sold-out size", async () => {
    const wrapper = await mountSuspended(SizeCells, {
      props: { modelValue: null, sizes, label: "Size", soldOutLabel: "Sold out" },
    })
    const soldOut = wrapper.findAll("[role='radio']")[1]!
    expect(soldOut.attributes("aria-disabled")).toBe("true")
    expect(soldOut.attributes("aria-label")).toBe("M, Sold out")
    expect(soldOut.find("[data-slot='strike']").exists()).toBe(true)
    await soldOut.trigger("click")
    expect(wrapper.emitted("update:modelValue")).toBeUndefined()
    await wrapper.findAll("[role='radio']")[2]!.trigger("click")
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["L"])
  })
})
