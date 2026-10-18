import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import HairlineAccordion from "~/components/HairlineAccordion.vue"

const items = [
  { id: "details", title: "Details" },
  { id: "care", title: "Fabric and care" },
]

describe("HairlineAccordion", () => {
  it("renders a heading button for each item", async () => {
    const wrapper = await mountSuspended(HairlineAccordion, {
      props: { items, headingLevel: 3 },
      slots: { details: () => "Cotton", care: () => "Wash cold" },
    })
    const buttons = wrapper.findAll("h3 > button")
    expect(buttons.map((b) => b.text())).toEqual(["Details", "Fabric and care"])
    expect(buttons[0]!.attributes("aria-expanded")).toBe("false")
    const controls = buttons[0]!.attributes("aria-controls")
    expect(controls).toBeTruthy()
    expect(wrapper.find(`[id="${controls}"]`).text()).toBe("Cotton")
    expect(buttons[0]!.classes()).toContain("min-h-14")
  })

  it("uses the heading level of the caller", async () => {
    const wrapper = await mountSuspended(HairlineAccordion, {
      props: { items, headingLevel: 2 },
      slots: { details: () => "Cotton", care: () => "Wash cold" },
    })
    expect(wrapper.findAll("h2 > button")).toHaveLength(2)
  })

  it("opens an item and keeps the other items as they are", async () => {
    const wrapper = await mountSuspended(HairlineAccordion, {
      props: { items, defaultOpen: ["care"] },
      slots: { details: () => "Cotton", care: () => "Wash cold" },
    })
    expect(wrapper.text()).toContain("Wash cold")
    await wrapper.findAll("button")[0]!.trigger("click")
    expect(wrapper.text()).toContain("Cotton")
    expect(wrapper.text()).toContain("Wash cold")
    const buttons = wrapper.findAll("button")
    expect(buttons.map((b) => b.attributes("aria-expanded"))).toEqual(["true", "true"])
    const controls = buttons[0]!.attributes("aria-controls")
    expect(wrapper.find(`[id="${controls}"]`).text()).toBe("Cotton")
  })

  it("keeps the content of a closed item mounted", async () => {
    const wrapper = await mountSuspended(HairlineAccordion, {
      props: { items, defaultOpen: ["details"] },
      slots: { details: () => "Cotton", care: () => "Wash cold" },
    })
    await wrapper.findAll("button")[0]!.trigger("click")
    expect(wrapper.findAll("button")[0]!.attributes("aria-expanded")).toBe("false")
    expect(wrapper.html()).toContain("Cotton")
  })
})
