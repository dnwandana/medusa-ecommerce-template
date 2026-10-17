import { describe, expect, it } from "vitest"
import {
  bankTransferDeadline,
  formatDeadline,
  isAwaitingBankTransfer,
} from "../../app/utils/bankTransfer"

const order = (status: string, provider: string) =>
  ({ payment_collections: [{ status, payment_sessions: [{ provider_id: provider }] }] }) as any

describe("isAwaitingBankTransfer", () => {
  it("is true for an authorized bank transfer order", () => {
    expect(isAwaitingBankTransfer(order("authorized", "pp_bank-transfer_bank-transfer"))).toBe(true)
  })
  it("is false for a captured bank transfer order", () => {
    expect(isAwaitingBankTransfer(order("completed", "pp_bank-transfer_bank-transfer"))).toBe(false)
  })
  it("is false for a gateway order", () => {
    expect(isAwaitingBankTransfer(order("authorized", "pp_test_test"))).toBe(false)
  })
  it("is false for an order with no payment collections", () => {
    expect(isAwaitingBankTransfer({} as any)).toBe(false)
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
