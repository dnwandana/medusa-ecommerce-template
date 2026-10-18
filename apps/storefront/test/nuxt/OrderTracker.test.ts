import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import OrderTracker from "~/components/OrderTracker.vue"
import type { TrackerCaption, TrackerStep, TrackerStepId } from "~/utils/orderTracker"

const step = (
  id: TrackerStepId,
  complete: boolean,
  current: boolean,
  date: string | null = null,
  caption: TrackerCaption | null = null
): TrackerStep => ({ id, complete, current, date, caption })

describe("OrderTracker", () => {
  it("shows the three steps in one row with a label", async () => {
    const wrapper = await mountSuspended(OrderTracker, {
      props: {
        steps: [
          step("confirmed", false, true),
          step("on_its_way", false, false),
          step("delivered", false, false),
        ],
      },
    })
    const list = wrapper.get("ol")
    expect(list.attributes("aria-label")).toBe("Order progress")
    expect(list.classes()).toContain("grid-cols-3")
    expect(list.findAll("li").map((item) => item.text())).toEqual([
      expect.stringContaining("Confirmed"),
      expect.stringContaining("On its way"),
      expect.stringContaining("Delivered"),
    ])
  })

  it("marks the current step and gives each state to screen readers", async () => {
    const wrapper = await mountSuspended(OrderTracker, {
      props: {
        steps: [
          step("confirmed", true, false, "2026-10-18T03:15:00.000Z"),
          step("on_its_way", false, true),
          step("delivered", false, false),
        ],
      },
    })
    expect(wrapper.get('[data-testid="tracker-on_its_way"]').attributes("aria-current")).toBe(
      "step"
    )
    expect(
      wrapper.get('[data-testid="tracker-confirmed"]').attributes("aria-current")
    ).toBeUndefined()
    expect(wrapper.get('[data-testid="tracker-confirmed"] .sr-only').text()).toBe("Done")
    expect(wrapper.get('[data-testid="tracker-on_its_way"] .sr-only').text()).toBe("Current step")
    expect(wrapper.get('[data-testid="tracker-delivered"] .sr-only').text()).toBe("Upcoming")
  })

  it("shows the date only on a complete step", async () => {
    const wrapper = await mountSuspended(OrderTracker, {
      props: {
        steps: [
          step("confirmed", true, false, "2026-10-18T03:15:00.000Z"),
          step("on_its_way", false, true),
          step("delivered", false, false),
        ],
      },
    })
    expect(wrapper.get('[data-testid="tracker-confirmed"]').text()).toContain("18 Oct, 10:15")
    expect(wrapper.get('[data-testid="tracker-on_its_way"]').text()).not.toMatch(/\d/)
  })

  it("marks no step as current when all steps are complete", async () => {
    const wrapper = await mountSuspended(OrderTracker, {
      props: {
        steps: [
          step("confirmed", true, false, "2026-10-18T03:15:00.000Z"),
          step("on_its_way", true, false, "2026-10-20T02:12:00.000Z"),
          step("delivered", true, false, "2026-10-22T09:40:00.000Z"),
        ],
      },
    })
    expect(wrapper.findAll('[aria-current="step"]')).toHaveLength(0)
    expect(wrapper.findAll(".sr-only").map((item) => item.text())).toEqual(["Done", "Done", "Done"])
  })

  it.each([
    ["waiting_for_payment", "Waiting for payment"],
    ["checking_receipt", "Checking your receipt"],
  ] as const)("shows the caption %s under Confirmed", async (caption, text) => {
    const wrapper = await mountSuspended(OrderTracker, {
      props: {
        steps: [
          step("confirmed", false, true, null, caption),
          step("on_its_way", false, false),
          step("delivered", false, false),
        ],
      },
    })
    expect(wrapper.get('[data-testid="tracker-confirmed"]').text()).toContain(text)
  })

  it("says that part of the order has shipped", async () => {
    const wrapper = await mountSuspended(OrderTracker, {
      props: {
        steps: [
          step("confirmed", true, false, "2026-10-18T03:15:00.000Z"),
          step("on_its_way", false, true, null, "partly_shipped"),
          step("delivered", false, false),
        ],
      },
    })
    expect(wrapper.get('[data-testid="tracker-on_its_way"]').text()).toContain(
      "Part of your order has shipped."
    )
  })
})
