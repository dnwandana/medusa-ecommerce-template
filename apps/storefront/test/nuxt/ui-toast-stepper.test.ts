import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { defineComponent, h } from "vue"
import { Sonner, Stepper, StepperIndicator, StepperItem, StepperTitle } from "#components"

describe("Sonner", () => {
  it("mounts the toaster", async () => {
    await expect(mountSuspended(Sonner, { attachTo: document.body })).resolves.toBeTruthy()
  })
})

describe("Stepper", () => {
  it("gives the active step the cur style and the earlier step the done style", async () => {
    const Steps = defineComponent(
      () => () =>
        h(Stepper, { modelValue: 2 }, () =>
          [1, 2, 3].map((step) =>
            h(StepperItem, { step, "data-testid": `step-${step}` }, () => [
              h(StepperIndicator, () => String(step)),
              h(StepperTitle, () => `Step ${step}`),
            ])
          )
        )
    )
    const wrapper = await mountSuspended(Steps)
    const indicator = (step: number) =>
      wrapper.find(`[data-testid="step-${step}"] [data-slot="stepper-indicator"]`)

    expect(wrapper.find('[data-testid="step-1"]').attributes("data-state")).toBe("completed")
    expect(wrapper.find('[data-testid="step-2"]').attributes("data-state")).toBe("active")
    expect(indicator(2).classes()).toContain("group-data-[state=active]:border-primary")
    expect(indicator(1).classes()).toContain("group-data-[state=completed]:bg-primary")
  })
})
