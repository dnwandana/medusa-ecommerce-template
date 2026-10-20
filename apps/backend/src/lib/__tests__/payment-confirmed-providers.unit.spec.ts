import { confirmsPaymentLater, PAYMENT_CONFIRMED_PROVIDERS } from "../payment-confirmed-providers"
import {
  ORDER_CANCEL_NOTE,
  ORDER_CANCEL_REASON,
  ORDER_REVIEW_REQUEST_SENT_AT,
} from "../storefront-metadata"

describe("payment confirmed providers", () => {
  it("lists the bank transfer provider only", () => {
    expect(PAYMENT_CONFIRMED_PROVIDERS).toEqual(["pp_bank-transfer_bank-transfer"])
    expect(confirmsPaymentLater("pp_bank-transfer_bank-transfer")).toBe(true)
    expect(confirmsPaymentLater("pp_midtrans_midtrans")).toBe(false)
    expect(confirmsPaymentLater(null)).toBe(false)
    expect(confirmsPaymentLater(undefined)).toBe(false)
  })

  it("names the metadata keys", () => {
    expect([ORDER_CANCEL_REASON, ORDER_CANCEL_NOTE, ORDER_REVIEW_REQUEST_SENT_AT]).toEqual([
      "cancel_reason",
      "cancel_note",
      "review_request_sent_at",
    ])
  })
})
