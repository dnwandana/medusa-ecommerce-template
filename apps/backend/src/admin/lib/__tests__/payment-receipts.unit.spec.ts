import {
  isBankTransferOrder,
  receiptColumnClass,
  receiptCountLabel,
  receiptFileUrl,
  validateNote,
  validateOptionalNote,
  widgetActions,
} from "../payment-receipts"

const bank = { provider_id: "pp_bank-transfer_bank-transfer" }

describe("payment receipt widget helpers", () => {
  it.each([
    [1, "col-span-12"],
    [2, "col-span-6"],
    [3, "col-span-4"],
  ])("gives %i receipts the class %s", (n, cls) => {
    expect(receiptColumnClass(n)).toBe(cls)
  })

  it("labels the count", () => {
    expect(receiptCountLabel(2)).toBe("2 of 3 receipts")
    expect(receiptCountLabel(1)).toBe("1 of 3 receipts")
    expect(receiptCountLabel(0)).toBe("No receipts yet")
  })

  it("offers the actions only while the payment waits", () => {
    const waiting = {
      status: "pending",
      payment_collections: [{ status: "authorized", payment_sessions: [bank] }],
    }
    expect(widgetActions(waiting)).toEqual({ accept: true, askForMore: true, cancel: true })
    expect(widgetActions({ ...waiting, status: "canceled" })).toEqual({
      accept: false,
      askForMore: false,
      cancel: false,
    })
    expect(
      widgetActions({
        status: "pending",
        payment_collections: [
          { status: "completed", payments: [{ ...bank, captured_at: "2026-10-18T00:00:00Z" }] },
        ],
      }).accept
    ).toBe(false)
  })

  it("finds a bank transfer order", () => {
    expect(
      isBankTransferOrder({
        status: "pending",
        payment_collections: [{ payment_sessions: [{ provider_id: "pp_x_x" }] }],
      })
    ).toBe(false)
    expect(
      isBankTransferOrder({ status: "pending", payment_collections: [{ payments: [bank] }] })
    ).toBe(true)
    expect(isBankTransferOrder({ status: "pending", payment_collections: null })).toBe(false)
  })

  it("checks the note", () => {
    expect(validateNote("  ")).toBe("Write a note for the customer.")
    expect(validateNote("x".repeat(501))).toBe("Write at most 500 characters.")
    expect(validateNote("x".repeat(500))).toBeNull()
    expect(validateNote("Rp 50.000 is missing")).toBeNull()
  })

  it("accepts an empty or a short optional note", () => {
    expect(validateOptionalNote("")).toBeNull()
    expect(validateOptionalNote("   ")).toBeNull()
    expect(validateOptionalNote("  ok  ")).toBeNull()
    expect(validateOptionalNote(` ${"x".repeat(500)} `)).toBeNull()
  })

  it("refuses a long optional note", () => {
    expect(validateOptionalNote("x".repeat(501))).toBe("Write at most 500 characters.")
  })

  it("builds the file URL", () => {
    expect(receiptFileUrl("prcpt_1")).toBe("/admin/payment-receipts/prcpt_1/file")
  })
})
