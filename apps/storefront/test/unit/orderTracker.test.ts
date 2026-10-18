import { describe, expect, it } from "vitest"
import { formatOrderDate, formatStepTime, trackerSteps } from "~/utils/orderTracker"

const base = {
  created_at: "2026-10-17T02:00:00.000Z",
  fulfillment_status: "not_fulfilled",
  fulfillments: [],
  payment_collections: [{ payments: [] }],
}

describe("trackerSteps", () => {
  it("has no complete step and asks for the payment before the payment", () => {
    const steps = trackerSteps(base, "waiting_for_payment")
    expect(steps.map((step) => step.id)).toEqual(["confirmed", "on_its_way", "delivered"])
    expect(steps.map((step) => step.complete)).toEqual([false, false, false])
    expect(steps[0]).toMatchObject({ current: true, date: null, caption: "waiting_for_payment" })
  })

  it("shows Checking your receipt for a submitted receipt", () => {
    expect(trackerSteps(base, "payment_submitted")[0]!.caption).toBe("checking_receipt")
  })

  it("completes Confirmed with the capture date", () => {
    const order = {
      ...base,
      payment_collections: [{ payments: [{ captured_at: "2026-10-18T03:15:00.000Z" }] }],
    }
    const steps = trackerSteps(order, "processing")
    expect(steps[0]).toMatchObject({
      complete: true,
      current: false,
      date: "2026-10-18T03:15:00.000Z",
    })
    expect(steps[1]).toMatchObject({ complete: false, current: true, date: null })
  })

  it("uses the order date for Confirmed when no payment has a capture date", () => {
    expect(trackerSteps(base, "processing")[0]!.date).toBe("2026-10-17T02:00:00.000Z")
  })

  it("keeps On its way open and shows a caption for a partial shipment", () => {
    const order = {
      ...base,
      fulfillment_status: "partially_shipped",
      fulfillments: [
        { shipped_at: "2026-10-20T01:00:00.000Z", delivered_at: null, canceled_at: null },
      ],
    }
    const step = trackerSteps(order, "processing")[1]!
    expect(step).toMatchObject({
      complete: false,
      current: true,
      date: null,
      caption: "partly_shipped",
    })
  })

  it("completes On its way with the latest ship date", () => {
    const order = {
      ...base,
      fulfillment_status: "shipped",
      fulfillments: [
        { shipped_at: "2026-10-20T01:00:00.000Z", delivered_at: null, canceled_at: null },
        { shipped_at: "2026-10-21T01:00:00.000Z", delivered_at: null, canceled_at: null },
        {
          shipped_at: "2026-10-22T01:00:00.000Z",
          delivered_at: null,
          canceled_at: "2026-10-22T02:00:00.000Z",
        },
      ],
    }
    const steps = trackerSteps(order, "shipped")
    expect(steps[1]).toMatchObject({
      complete: true,
      date: "2026-10-21T01:00:00.000Z",
      caption: null,
    })
    expect(steps[2]).toMatchObject({ complete: false, current: true, date: null })
  })

  it("completes all steps for a delivered order and has no current step", () => {
    const order = {
      ...base,
      fulfillment_status: "delivered",
      fulfillments: [
        {
          shipped_at: "2026-10-20T01:00:00.000Z",
          delivered_at: "2026-10-23T05:00:00.000Z",
          canceled_at: null,
        },
      ],
    }
    const steps = trackerSteps(order, "delivered")
    expect(steps.map((step) => step.complete)).toEqual([true, true, true])
    expect(steps.some((step) => step.current)).toBe(false)
    expect(steps[2]!.date).toBe("2026-10-23T05:00:00.000Z")
  })
})

describe("order dates", () => {
  it("formats the order date with the long month in Jakarta time", () => {
    expect(formatOrderDate("2026-10-17T02:00:00.000Z", "en")).toBe("17 October 2026")
    expect(formatOrderDate("2026-10-17T02:00:00.000Z", "id")).toBe("17 Oktober 2026")
    expect(formatOrderDate("2026-10-17T18:00:00.000Z", "en")).toBe("18 October 2026")
  })

  it("formats the step time as day, short month and 24-hour time", () => {
    expect(formatStepTime("2026-10-18T03:15:00.000Z", "en")).toBe("18 Oct, 10:15")
    expect(formatStepTime("2026-10-18T03:15:00.000Z", "id")).toMatch(/^18 Okt, 10:15$/)
  })
})
