import { describe, expect, it } from "vitest"
import { cancelNoticeKey, refundedAmount, whatsappHref } from "~/utils/orderNotices"

describe("cancelNoticeKey", () => {
  it("selects the 24-hour text for a payment timeout", () => {
    expect(cancelNoticeKey("payment_timeout")).toBe("order.cancelledTimeout")
  })

  it.each([[null], [undefined], [""], ["customer_request"]])(
    "selects the store text for %s",
    (reason) => {
      expect(cancelNoticeKey(reason)).toBe("order.cancelledByStore")
    }
  )
})

describe("refundedAmount", () => {
  it("adds the refunds of all payment collections", () => {
    expect(
      refundedAmount({
        payment_collections: [{ refunded_amount: 50000 }, { refunded_amount: "25000" }],
      })
    ).toBe(75000)
  })

  it("counts a missing value as zero", () => {
    expect(refundedAmount({ payment_collections: [{ refunded_amount: null }, {}] })).toBe(0)
    expect(refundedAmount({ payment_collections: null })).toBe(0)
    expect(refundedAmount({})).toBe(0)
  })

  it("counts a value that is not a number as zero", () => {
    expect(
      refundedAmount({
        payment_collections: [{ refunded_amount: "abc" }, { refunded_amount: 1000 }],
      })
    ).toBe(1000)
  })
})

describe("whatsappHref", () => {
  it("keeps only the digits", () => {
    expect(whatsappHref("+62 812-3456-7890")).toBe("https://wa.me/6281234567890")
  })

  it.each([[null], [undefined], [""], ["  -  "]])("gives null for %s", (number) => {
    expect(whatsappHref(number)).toBeNull()
  })
})
