import { checkInvoice, findSessionId, isPaidStatus } from "../invoice"

describe("isPaidStatus", () => {
  it("accepts only the status paid", () => {
    expect(isPaidStatus("paid")).toBe(true)
    expect(isPaidStatus("unpaid")).toBe(false)
    expect(isPaidStatus("closed")).toBe(false)
    expect(isPaidStatus("active")).toBe(false)
    expect(isPaidStatus("expired")).toBe(false)
  })

  // Review Focus: the status in capital letters, and a status that is not a string.
  it("ignores the letter case and the spaces", () => {
    expect(isPaidStatus("PAID")).toBe(true)
    expect(isPaidStatus(" Paid ")).toBe(true)
  })

  it("returns false for a value that is not a string", () => {
    expect(isPaidStatus(undefined)).toBe(false)
    expect(isPaidStatus(null)).toBe(false)
    expect(isPaidStatus(true)).toBe(false)
  })
})

describe("checkInvoice", () => {
  it("reports paid when the status is paid and the amount is equal", () => {
    expect(checkInvoice({ status: "paid", amount: 95000 }, 95000)).toBe("paid")
  })

  it("reports unpaid for each other status", () => {
    expect(checkInvoice({ status: "unpaid", amount: 95000 }, 95000)).toBe("unpaid")
    expect(checkInvoice({ status: "closed", amount: 95000 }, 95000)).toBe("unpaid")
    expect(checkInvoice({ status: "expired", amount: 95000 }, 95000)).toBe("unpaid")
  })

  it("reports amount_mismatch when a paid invoice has a different amount", () => {
    expect(checkInvoice({ status: "paid", amount: 1 }, 95000)).toBe("amount_mismatch")
    expect(checkInvoice({ status: "paid", amount: 95001 }, 95000)).toBe("amount_mismatch")
  })

  // Review Focus: Mayar can return the amount as a string.
  it("compares the amount as a number", () => {
    expect(checkInvoice({ status: "paid", amount: "95000" }, 95000)).toBe("paid")
    expect(checkInvoice({ status: "paid", amount: "95000.00" }, 95000)).toBe("paid")
  })

  it("reports amount_mismatch when the amount is not a number", () => {
    expect(checkInvoice({ status: "paid", amount: "abc" }, 95000)).toBe("amount_mismatch")
    expect(checkInvoice({ status: "paid", amount: undefined as any }, 95000)).toBe(
      "amount_mismatch"
    )
  })
})

describe("findSessionId", () => {
  it("reads the session id from the top-level extra data", () => {
    expect(findSessionId({ extraData: { session_id: "payses_1" } })).toBe("payses_1")
  })

  it("reads the session id from the first transaction that has one", () => {
    expect(
      findSessionId({
        extraData: null,
        transactions: [
          { id: "t1", extraData: null },
          { id: "t2", extraData: { session_id: "payses_2" } },
        ],
      })
    ).toBe("payses_2")
  })

  it("returns undefined when no extra data has a session id", () => {
    expect(findSessionId({})).toBeUndefined()
    expect(findSessionId({ extraData: {}, transactions: [] })).toBeUndefined()
    expect(findSessionId({ extraData: { session_id: 5 } })).toBeUndefined()
    expect(findSessionId({ extraData: { session_id: "" } })).toBeUndefined()
  })
})
