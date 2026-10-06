import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CheckoutStepper } from "#components"

const state = (wrapper: Awaited<ReturnType<typeof mountSuspended>>, step: number) =>
  wrapper.find(`[data-testid="step-${step}"]`).attributes("data-state")

describe("CheckoutStepper", () => {
  it("shows the three steps in order", async () => {
    const wrapper = await mountSuspended(CheckoutStepper, { props: { current: 1 } })

    expect(wrapper.findAll('[data-slot="stepper-title"]').map((title) => title.text())).toEqual([
      "Address",
      "Shipping",
      "Payment",
    ])
  })

  it("marks the current step and the completed steps", async () => {
    const wrapper = await mountSuspended(CheckoutStepper, { props: { current: 2 } })

    expect(state(wrapper, 1)).toBe("completed")
    expect(state(wrapper, 2)).toBe("active")
    expect(state(wrapper, 3)).toBe("inactive")
  })

  it("shows a check mark in a completed step and the number in the other steps", async () => {
    const wrapper = await mountSuspended(CheckoutStepper, { props: { current: 3 } })

    expect(
      wrapper.find('[data-testid="step-1"] [data-slot="stepper-indicator"] svg').exists()
    ).toBe(true)
    expect(wrapper.find('[data-testid="step-3"] [data-slot="stepper-indicator"]').text()).toBe("3")
  })

  it("has no step that the user can click", async () => {
    const wrapper = await mountSuspended(CheckoutStepper, { props: { current: 2 } })

    expect(wrapper.find("button").exists()).toBe(false)
  })
})
