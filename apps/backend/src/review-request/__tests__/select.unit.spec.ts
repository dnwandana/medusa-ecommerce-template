import {
  REVIEW_REQUEST_BATCH,
  REVIEW_REQUEST_DELAY_MS,
  REVIEW_REQUEST_LOOKBACK_MS,
  reviewWindow,
  selectDueOrders,
  type DeliveredOrder,
} from "../select"

const NOW = new Date("2026-10-31T20:00:00Z")

const order = (
  id: string,
  delivered: string | null,
  extra: Partial<DeliveredOrder> = {}
): DeliveredOrder => ({
  id,
  status: "completed",
  metadata: null,
  fulfillments: [{ delivered_at: delivered }],
  ...extra,
})

describe("selectDueOrders", () => {
  it("selects orders delivered 7 days ago or more, oldest first", () => {
    expect(
      selectDueOrders(
        [
          order("a", "2026-10-25T00:00:00Z"),
          order("b", "2026-10-20T00:00:00Z"),
          order("c", "2026-10-24T20:00:01Z"),
          order("d", "2026-10-24T20:00:00Z"),
        ],
        NOW
      )
    ).toEqual(["b", "d"])
  })

  it("skips cancelled, marked, and undelivered orders", () => {
    expect(
      selectDueOrders(
        [
          order("a", "2026-10-20T00:00:00Z", { status: "canceled" }),
          order("b", "2026-10-20T00:00:00Z", { metadata: { review_request_sent_at: "x" } }),
          order("c", null),
          order("d", "2026-10-20T00:00:00Z", { fulfillments: [] }),
          order("e", "2026-10-20T00:00:00Z", { fulfillments: null }),
          order("f", "not a date"),
        ],
        NOW
      )
    ).toEqual([])
  })

  it("sorts an order by its oldest delivered fulfillment", () => {
    const twoParcels = order("a", null, {
      fulfillments: [
        { delivered_at: "2026-10-30T00:00:00Z" },
        { delivered_at: null },
        { delivered_at: new Date("2026-10-10T00:00:00Z") },
      ],
    })
    expect(selectDueOrders([order("b", "2026-10-15T00:00:00Z"), twoParcels], NOW)).toEqual([
      "a",
      "b",
    ])
  })

  it("caps at 100", () => {
    const orders = Array.from({ length: 150 }, (_, i) => order(`o${i}`, "2026-10-01T00:00:00Z"))
    expect(REVIEW_REQUEST_BATCH).toBe(100)
    expect(selectDueOrders(orders, NOW)).toHaveLength(100)
  })
})

describe("reviewWindow", () => {
  it("ends 7 days before now and starts 30 days before that", () => {
    expect(REVIEW_REQUEST_DELAY_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(REVIEW_REQUEST_LOOKBACK_MS).toBe(30 * 24 * 60 * 60 * 1000)
    expect(reviewWindow(NOW)).toEqual({
      from: new Date("2026-09-24T20:00:00Z"),
      to: new Date("2026-10-24T20:00:00Z"),
    })
  })
})
