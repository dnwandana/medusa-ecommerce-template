import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { StarRating } from "#components"

describe("StarRating display mode", () => {
  it("rounds to the nearest half and shows a half star", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { rating: 3.6 } })

    expect(wrapper.findAll('[data-filled="true"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-half="true"]')).toHaveLength(1)
    expect(wrapper.attributes("role")).toBe("img")
  })

  it("clamps a rating above 5", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { rating: 7 } })

    expect(wrapper.findAll('[data-filled="true"]')).toHaveLength(5)
  })
})

describe("StarRating input mode", () => {
  it("renders five native radios with the name rating and the values 1 to 5", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { mode: "input", modelValue: null } })
    const radios = wrapper.findAll('input[type="radio"]')

    expect(radios).toHaveLength(5)
    expect(radios.map((radio) => radio.attributes("name"))).toEqual(Array(5).fill("rating"))
    expect(radios.map((radio) => radio.attributes("value"))).toEqual(["1", "2", "3", "4", "5"])
    expect(wrapper.findAll("label")).toHaveLength(5)
  })

  it("emits the value of the selected radio", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { mode: "input", modelValue: null } })

    await wrapper.find('input[value="4"]').setValue(true)

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([4])
  })

  it("checks the radio of the model value", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { mode: "input", modelValue: 3 } })

    expect((wrapper.find('input[value="3"]').element as HTMLInputElement).checked).toBe(true)
  })
})
