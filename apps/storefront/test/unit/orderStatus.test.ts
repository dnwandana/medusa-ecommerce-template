import { describe, expect, it } from "vitest"
import {
  customerStatus,
  receiptPhase,
  type CustomerStatus,
  type OrderPaymentState,
  type StatusOrder,
} from "~/utils/orderStatus"

const bank = (over: Partial<OrderPaymentState> = {}): OrderPaymentState => ({
  order_id: "o",
  provider_id: "pp_bank-transfer_bank-transfer",
  captured_at: null,
  deadline_at: "2026-10-18T07:30:00.000Z",
  receipts: [],
  note: null,
  ...over,
})

const receipt = (at: string) => ({ id: at, file_name: "a.png", created_at: at })

describe("customerStatus", () => {
  it.each<[StatusOrder, CustomerStatus]>([
    [{ status: "canceled", payment_state: bank() }, "cancelled"],
    [{ status: "completed", payment_status: "refunded" }, "refunded"],
    [{ status: "pending", fulfillment_status: "delivered" }, "delivered"],
    [{ status: "pending", fulfillment_status: "partially_shipped" }, "shipped"],
    [{ status: "pending", payment_state: bank() }, "waiting_for_payment"],
    [
      { status: "pending", payment_state: bank({ receipts: [receipt("2026-10-18T02:00:00Z")] }) },
      "payment_submitted",
    ],
    [
      {
        status: "pending",
        payment_state: bank({
          receipts: [receipt("2026-10-18T02:00:00Z")],
          note: { note: "x", created_at: "2026-10-18T03:00:00Z" },
        }),
      },
      "waiting_for_payment",
    ],
    [
      { status: "pending", payment_state: bank({ captured_at: "2026-10-18T04:00:00Z" }) },
      "processing",
    ],
    [
      {
        status: "pending",
        payment_status: "authorized",
        payment_state: bank({ provider_id: "pp_x_x" }),
      },
      "processing",
    ],
  ])("gives %j the status %s", (order, status) => {
    expect(customerStatus(order)).toBe(status)
  })
})

describe("receiptPhase", () => {
  it("gives the receipt phase", () => {
    expect(receiptPhase(bank())).toBe("none")
    expect(
      receiptPhase(
        bank({
          receipts: [receipt("2026-10-18T02:00:00Z")],
          note: { note: "x", created_at: "2026-10-18T01:00:00Z" },
        })
      )
    ).toBe("submitted")
    expect(
      receiptPhase(
        bank({
          receipts: [receipt("2026-10-18T02:00:00Z")],
          note: { note: "x", created_at: "2026-10-18T03:00:00Z" },
        })
      )
    ).toBe("more")
  })

  it("asks for more when a note exists and no receipt exists", () => {
    expect(receiptPhase(bank({ note: { note: "x", created_at: "2026-10-18T03:00:00Z" } }))).toBe(
      "more"
    )
  })
})
