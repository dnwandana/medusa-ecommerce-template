import { BANK_TRANSFER_PROVIDER_ID } from "../../modules/bank-transfer/constants"
import {
  capturablePaymentId,
  isBankTransferOrder,
  isPaymentCaptured,
  PaymentOrder,
  RECEIPT_BLOCK_MESSAGES,
  receiptBlockReason,
} from "../bank-transfer-order"

const bank = { provider_id: BANK_TRANSFER_PROVIDER_ID }
const order = (over: Partial<PaymentOrder> = {}): PaymentOrder => ({
  status: "pending",
  payment_collections: [
    {
      status: "authorized",
      payment_sessions: [bank],
      payments: [{ id: "pay_1", ...bank, captured_at: null }],
    },
  ],
  ...over,
})

describe("bank transfer order rules", () => {
  it("finds a bank transfer order", () => {
    expect(isBankTransferOrder(order())).toBe(true)
    expect(
      isBankTransferOrder(
        order({ payment_collections: [{ payment_sessions: [{ provider_id: "pp_x_x" }] }] })
      )
    ).toBe(false)
    expect(isBankTransferOrder({ status: "pending" })).toBe(false)
  })

  it("finds a bank transfer order from the payment only", () => {
    expect(
      isBankTransferOrder(
        order({
          payment_collections: [{ payment_sessions: null, payments: [{ id: "p", ...bank }] }],
        })
      )
    ).toBe(true)
    expect(isBankTransferOrder({ status: "pending", payment_collections: [null] })).toBe(false)
  })

  it("finds a captured payment", () => {
    const captured = order({
      payment_collections: [
        {
          status: "completed",
          payments: [{ id: "pay_1", ...bank, captured_at: "2026-10-18T01:00:00Z" }],
        },
      ],
    })
    expect(isPaymentCaptured(captured)).toBe(true)
    expect(isPaymentCaptured(order())).toBe(false)
  })

  it("gives the payment that the owner can capture", () => {
    expect(capturablePaymentId(order())).toBe("pay_1")
    expect(
      capturablePaymentId(
        order({
          payment_collections: [
            { payments: [{ id: "pay_1", ...bank, canceled_at: "2026-10-18T01:00:00Z" }] },
          ],
        })
      )
    ).toBeNull()
    expect(
      capturablePaymentId(
        order({ payment_collections: [{ payments: [{ id: "pay_2", provider_id: "pp_x_x" }] }] })
      )
    ).toBeNull()
  })

  it.each([
    [
      order({ payment_collections: [{ payment_sessions: [{ provider_id: "pp_x_x" }] }] }),
      3,
      "not_bank_transfer",
    ],
    [order({ status: "canceled" }), 0, "cancelled"],
    [
      order({ payment_collections: [{ status: "completed", payment_sessions: [bank] }] }),
      0,
      "captured",
    ],
    [order(), 3, "limit"],
    [order(), 2, null],
  ])("gives the block reason %#", (o, count, reason) => {
    expect(receiptBlockReason(o, count)).toBe(reason)
  })

  it("has a message for each block reason", () => {
    expect(RECEIPT_BLOCK_MESSAGES.limit).toBe(
      "You uploaded 3 receipts. Contact the store to send another receipt."
    )
  })
})
