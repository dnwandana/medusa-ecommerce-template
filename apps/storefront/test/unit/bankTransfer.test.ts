import { describe, expect, it } from "vitest"
import {
  bankTransferDeadline,
  formatDeadline,
  isAwaitingBankTransfer,
} from "../../app/utils/bankTransfer"
import type { OrderPaymentState } from "../../app/utils/orderStatus"

const bankState = (over: Partial<OrderPaymentState> = {}): OrderPaymentState => ({
  order_id: "order_1",
  provider_id: "pp_bank-transfer_bank-transfer",
  captured_at: null,
  receipts: [],
  note: null,
  ...over,
})

describe("isAwaitingBankTransfer", () => {
  it("waits for a bank transfer that is not captured", () => {
    expect(isAwaitingBankTransfer({ status: "pending", payment_state: bankState() })).toBe(true)
    expect(
      isAwaitingBankTransfer({
        status: "pending",
        payment_state: bankState({ captured_at: "2026-10-18T04:00:00Z" }),
      })
    ).toBe(false)
    expect(isAwaitingBankTransfer({ status: "canceled", payment_state: bankState() })).toBe(false)
    expect(
      isAwaitingBankTransfer({
        status: "pending",
        payment_state: bankState({ provider_id: "pp_x_x" }),
      })
    ).toBe(false)
    expect(isAwaitingBankTransfer({ status: "pending", payment_state: null })).toBe(false)
  })

  it("is false for no order and for an order with no payment state", () => {
    expect(isAwaitingBankTransfer(null)).toBe(false)
    expect(isAwaitingBankTransfer(undefined)).toBe(false)
    expect(isAwaitingBankTransfer({ status: "pending" })).toBe(false)
  })
})

describe("deadline", () => {
  it("adds 24 hours to the order time", () => {
    expect(bankTransferDeadline("2026-10-17T07:30:00Z").toISOString()).toBe(
      "2026-10-18T07:30:00.000Z"
    )
  })
  it("writes the deadline in WIB for each locale", () => {
    const date = new Date("2026-10-18T07:30:00Z")
    expect(formatDeadline(date, "en")).toBe("18 October 2026, 14:30 WIB")
    expect(formatDeadline(date, "id")).toBe("18 Oktober 2026, 14.30 WIB")
  })
})
