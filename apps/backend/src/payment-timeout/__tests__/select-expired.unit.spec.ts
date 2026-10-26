import {
  MAX_CANCELS_PER_RUN,
  selectExpiredOrders,
  timeoutWindow,
  TimeoutOrder,
} from "../select-expired"

const HOUR = 60 * 60 * 1000
const DEADLINE = 24 * HOUR
const now = new Date("2026-10-19T12:00:00Z")
const bank = { provider_id: "pp_bank-transfer_bank-transfer" }
const order = (id: string, placed: string, over: Partial<TimeoutOrder> = {}): TimeoutOrder => ({
  id,
  status: "pending",
  created_at: placed,
  payment_collections: [
    {
      status: "authorized",
      payment_sessions: [bank],
      payments: [{ id: `pay_${id}`, ...bank, captured_at: null }],
    },
  ],
  ...over,
})

describe("selectExpiredOrders", () => {
  it("selects an unpaid bank order with no receipt after 24 hours", () => {
    expect(
      selectExpiredOrders([order("a", "2026-10-18T12:00:00Z")], new Map(), now, DEADLINE)
    ).toEqual(["a"])
  })

  it("accepts a Date as the placement time", () => {
    const placed = order("a", "2026-10-18T00:00:00Z", {
      created_at: new Date("2026-10-18T00:00:00Z"),
    })
    expect(selectExpiredOrders([placed], new Map(), now, DEADLINE)).toEqual(["a"])
  })

  it("keeps an order younger than 24 hours", () => {
    expect(
      selectExpiredOrders([order("a", "2026-10-18T12:00:01Z")], new Map(), now, DEADLINE)
    ).toEqual([])
  })

  it("never selects an order with a receipt", () => {
    expect(
      selectExpiredOrders([order("a", "2026-10-17T00:00:00Z")], new Map([["a", 1]]), now, DEADLINE)
    ).toEqual([])
  })

  it("selects an order with a count of 0", () => {
    expect(
      selectExpiredOrders([order("a", "2026-10-17T00:00:00Z")], new Map([["a", 0]]), now, DEADLINE)
    ).toEqual(["a"])
  })

  it("keeps an order that the owner captured with no receipt", () => {
    const captured = order("a", "2026-10-17T00:00:00Z", {
      payment_collections: [
        {
          status: "completed",
          payment_sessions: [bank],
          payments: [{ id: "p", ...bank, captured_at: "2026-10-18T00:00:00Z" }],
        },
      ],
    })
    expect(selectExpiredOrders([captured], new Map(), now, DEADLINE)).toEqual([])
  })

  it("keeps a cancelled order and a gateway order", () => {
    const gateway = order("b", "2026-10-17T00:00:00Z", {
      payment_collections: [
        { status: "authorized", payment_sessions: [{ provider_id: "pp_x_x" }] },
      ],
    })
    expect(
      selectExpiredOrders(
        [order("a", "2026-10-17T00:00:00Z", { status: "canceled" }), gateway],
        new Map(),
        now,
        DEADLINE
      )
    ).toEqual([])
  })

  it("gives the oldest 50", () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      order(`o${i}`, new Date(Date.UTC(2026, 9, 17, 0, 59 - i)).toISOString())
    )
    const ids = selectExpiredOrders(many, new Map(), now, DEADLINE)
    expect(ids).toHaveLength(MAX_CANCELS_PER_RUN)
    expect(ids[0]).toBe("o59")
  })

  it("gives the window of the query", () => {
    expect(timeoutWindow(now, DEADLINE)).toEqual({
      from: new Date("2026-10-12T12:00:00Z"),
      to: new Date("2026-10-18T12:00:00Z"),
    })
  })

  it("keeps the 7-day window for the default deadline of 24 hours", () => {
    const { from, to } = timeoutWindow(now, 24 * HOUR)
    expect(now.getTime() - from.getTime()).toBe(7 * 24 * HOUR)
    expect(now.getTime() - to.getTime()).toBe(24 * HOUR)
  })

  it("makes the window longer than a deadline of 10 days", () => {
    const { from, to } = timeoutWindow(now, 240 * HOUR)
    expect(now.getTime() - to.getTime()).toBe(240 * HOUR)
    expect(now.getTime() - from.getTime()).toBe(240 * HOUR + 6 * 24 * HOUR)
  })

  it("uses the given deadline to select the orders", () => {
    const hoursAgo = (hours: number) => new Date(now.getTime() - hours * HOUR).toISOString()
    const orders = [order("order_30h", hoursAgo(30)), order("order_50h", hoursAgo(50))]
    expect(selectExpiredOrders(orders, new Map(), now, 48 * HOUR)).toEqual(["order_50h"])
  })
})
