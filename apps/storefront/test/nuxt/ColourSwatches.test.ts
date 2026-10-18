import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ColourSwatches from "~/components/ColourSwatches.vue"

const HEX = [
  { value: "Sand", hex: "#d8c9ae" },
  { value: "Sage", hex: "#9aa68c" },
]

describe("ColourSwatches", () => {
  it("draws round swatches and shows the selected name", async () => {
    const wrapper = await mountSuspended(ColourSwatches, {
      props: { modelValue: "Sand", values: HEX, label: "Colour" },
    })
    const radios = wrapper.findAll("[role='radio']")

    expect(wrapper.get("[role='radiogroup']").attributes("aria-label")).toBe("Colour")
    expect(radios.map((radio) => radio.attributes("aria-label"))).toEqual(["Sand", "Sage"])
    expect(radios.map((radio) => radio.attributes("title"))).toEqual(["Sand", "Sage"])
    expect(radios[0]!.attributes("aria-checked")).toBe("true")
    expect(radios[1]!.attributes("aria-checked")).toBe("false")
    expect(wrapper.get("[data-testid='colour-swatches-selected']").text()).toBe("Sand")
  })

  it("paints each dot with the hex of its value", async () => {
    const wrapper = await mountSuspended(ColourSwatches, {
      props: { modelValue: null, values: HEX, label: "Colour" },
    })
    const dots = wrapper.findAll("[data-slot='swatch-dot']")

    expect(dots.map((dot) => dot.attributes("style"))).toEqual([
      expect.stringContaining("background-color: #d8c9ae"),
      expect.stringContaining("background-color: #9aa68c"),
    ])
  })

  it("emits the new colour on a click", async () => {
    const wrapper = await mountSuspended(ColourSwatches, {
      props: { modelValue: "Sand", values: HEX, label: "Colour" },
    })
    await wrapper.findAll("[role='radio']")[1]!.trigger("click")
    expect(wrapper.emitted("update:modelValue")).toEqual([["Sage"]])
  })

  it("uses text cells when a value has no hex", async () => {
    const wrapper = await mountSuspended(ColourSwatches, {
      props: { modelValue: null, values: [...HEX, { value: "Navy", hex: null }], label: "Colour" },
    })
    expect(wrapper.findComponent({ name: "SizeCells" }).props("sizes")).toEqual([
      { value: "Sand", soldOut: false },
      { value: "Sage", soldOut: false },
      { value: "Navy", soldOut: false },
    ])
    expect(wrapper.find("[data-slot='swatch-dot']").exists()).toBe(false)
  })
})
