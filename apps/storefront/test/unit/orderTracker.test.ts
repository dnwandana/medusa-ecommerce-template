import { describe, expect, it } from "vitest"
import type { OrderPaymentState } from "~/utils/orderStatus"
import { formatOrderDate, formatStepTime, trackerSteps } from "~/utils/orderTracker"

const bankState = (over: Partial<OrderPaymentState> = {}): OrderPaymentState => ({
  order_id: "order_1",
  provider_id: "pp_bank-transfer_bank-transfer",
  captured_at: null,
  deadline_at: "2026-10-18T02:00:00.000Z",
  receipts: [],
  note: null,
  ...over,
})

const base = {
  created_at: "2026-10-17T02:00:00.000Z",
  fulfillment_status: "not_fulfilled",
  fulfillments: [],
  payment_state: bankState(),
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
      payment_state: bankState({ captured_at: "2026-10-18T03:15:00.000Z" }),
    }
    const steps = trackerSteps(order, "processing")
    expect(steps[0]).toMatchObject({
      complete: true,
      current: false,
      date: "2026-10-18T03:15:00.000Z",
    })
    expect(steps[1]).toMatchObject({ complete: false, current: true, date: null })
  })

  it("dates Confirmed with the capture time", () => {
    const steps = trackerSteps(
      {
        created_at: "2026-10-17T07:30:00Z",
        payment_state: bankState({ captured_at: "2026-10-18T04:00:00Z" }),
      },
      "processing"
    )
    expect(steps[0]).toMatchObject({
      id: "confirmed",
      complete: true,
      date: "2026-10-18T04:00:00.000Z",
    })
  })

  it("keeps Confirmed open for an authorized gateway payment", () => {
    const steps = trackerSteps(
      {
        created_at: "2026-10-17T07:30:00Z",
        payment_collections: [{ status: "authorized" }],
        payment_state: bankState({ provider_id: "pp_x_x" }),
      },
      "processing"
    )
    expect(steps[0]).toMatchObject({ id: "confirmed", complete: false, current: true, date: null })
  })

  // Review Focus: a captured gateway payment still confirms the order.
  it("completes Confirmed for a captured gateway payment, with no date", () => {
    const steps = trackerSteps(
      {
        created_at: "2026-10-17T07:30:00Z",
        payment_collections: [{ status: "completed" }],
        payment_state: bankState({ provider_id: "pp_x_x" }),
      },
      "processing"
    )
    expect(steps[0]).toMatchObject({ id: "confirmed", complete: true, date: null })
  })

  it("keeps Confirmed open for a bank transfer that is not captured", () => {
    const steps = trackerSteps(
      { ...base, payment_collections: [{ status: "authorized" }] },
      "payment_submitted"
    )
    expect(steps[0]).toMatchObject({ complete: false, current: true, date: null })
  })

  it("keeps Confirmed open for a gateway payment that is not paid", () => {
    const steps = trackerSteps(
      {
        created_at: "2026-10-17T07:30:00Z",
        payment_collections: [{ status: "not_paid" }],
        payment_state: bankState({ provider_id: "pp_x_x" }),
      },
      "processing"
    )
    expect(steps[0]).toMatchObject({ complete: false, current: true })
  })

  it("keeps On its way open and shows a caption for a partial shipment", () => {
    const order = {
      ...base,
      fulfillment_status: "partially_shipped",
      fulfillments: [
        { shipped_at: "2026-10-20T01:00:00.000Z", delivered_at: null, canceled_at: null },
      ],
    }
    // `customerStatus` gives "shipped" for a partial shipment.
    const step = trackerSteps(order, "shipped")[1]!
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
