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
  // The Store order route does not return the refunds of a payment collection. The order summary
  // has the total of the refunds.
  it("reads the refunded total of the order summary", () => {
    expect(refundedAmount({ summary: { refunded_total: 75000 } })).toBe(75000)
  })

  it("reads an amount that the Store API sends as a string", () => {
    expect(refundedAmount({ summary: { refunded_total: "25000" } })).toBe(25000)
  })

  it("counts a missing value as zero", () => {
    expect(refundedAmount({ summary: { refunded_total: null } })).toBe(0)
    expect(refundedAmount({ summary: {} })).toBe(0)
    expect(refundedAmount({ summary: null })).toBe(0)
    expect(refundedAmount({})).toBe(0)
  })

  it("counts a value that is not a number as zero", () => {
    expect(refundedAmount({ summary: { refunded_total: "abc" } })).toBe(0)
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
