import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ProgressRule from "~/components/ProgressRule.vue"

describe("ProgressRule", () => {
  it("shows an indeterminate bar with no value", async () => {
    const wrapper = await mountSuspended(ProgressRule, { props: { label: "Loading more" } })
    const bar = wrapper.get("[role='progressbar']")
    expect(bar.attributes("aria-label")).toBe("Loading more")
    expect(bar.attributes("aria-valuenow")).toBeUndefined()
    expect(bar.attributes("aria-valuemin")).toBeUndefined()
    expect(wrapper.get("[data-slot='bar']").classes()).toContain(
      "animate-[progress-rule_1.6s_ease-in-out_infinite]"
    )
  })

  it("shows the value as a width", async () => {
    const wrapper = await mountSuspended(ProgressRule, {
      props: { label: "Photo 2 of 4", value: 50 },
    })
    const bar = wrapper.get("[role='progressbar']")
    expect(bar.attributes("aria-valuenow")).toBe("50")
    expect(bar.attributes("aria-valuemin")).toBe("0")
    expect(bar.attributes("aria-valuemax")).toBe("100")
    expect(wrapper.get("[data-slot='bar']").attributes("style")).toContain("width: 50%")
  })

  it("keeps the value from 0 to 100", async () => {
    const wrapper = await mountSuspended(ProgressRule, { props: { label: "Upload", value: 140 } })
    expect(wrapper.get("[role='progressbar']").attributes("aria-valuenow")).toBe("100")
    expect(wrapper.get("[data-slot='bar']").attributes("style")).toContain("width: 100%")
  })
})
