import {
  checkPaidCarts,
  MAX_SESSION_AGE_MS,
  MAX_SESSIONS_PER_RUN,
  PendingSession,
  RecoveryDeps,
} from "../check-paid-carts"

const NOW = new Date("2026-10-02T12:00:00.000Z")
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000)

const session = (overrides: Partial<PendingSession> = {}): PendingSession => ({
  sessionId: "payses_1",
  invoiceId: "inv_1",
  amount: 95000,
  createdAt: hoursAgo(1),
  cartId: "cart_1",
  cartCompleted: false,
  customerEmail: "buyer@example.com",
  ...overrides,
})

const makeDeps = (sessions: PendingSession[], overrides: Partial<RecoveryDeps> = {}) => {
  const deps = {
    now: () => NOW,
    ownerEmail: "owner@example.com",
    listPendingSessions: jest.fn().mockResolvedValue(sessions),
    isInvoicePaid: jest.fn().mockResolvedValue(true),
    completeCart: jest.fn().mockResolvedValue(undefined),
    sendAlert: jest.fn().mockResolvedValue(undefined),
    markAlertSent: jest.fn().mockResolvedValue(undefined),
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    ...overrides,
  }
  return deps
}

describe("checkPaidCarts", () => {
  it("has the limits of the spec", () => {
    expect(MAX_SESSION_AGE_MS).toBe(48 * 60 * 60 * 1000)
    expect(MAX_SESSIONS_PER_RUN).toBe(40)
  })

  it("completes the cart of a paid invoice", async () => {
    const deps = makeDeps([session()])

    const result = await checkPaidCarts(deps)

    expect(deps.isInvoicePaid).toHaveBeenCalledWith("inv_1")
    expect(deps.completeCart).toHaveBeenCalledWith("cart_1")
    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(result).toEqual({ checked: 1, completed: 1, alerted: 0 })
    expect(deps.logger.info).toHaveBeenCalledWith(
      "The check-paid-carts job completed the cart cart_1 for the paid Mayar invoice inv_1."
    )
  })

  it("does nothing for an invoice that is not paid", async () => {
    const deps = makeDeps([session()], { isInvoicePaid: jest.fn().mockResolvedValue(false) })

    const result = await checkPaidCarts(deps)

    expect(deps.completeCart).not.toHaveBeenCalled()
    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 0 })
  })

  it("sends one alert and marks the cart when the completion fails", async () => {
    const deps = makeDeps([session()], {
      completeCart: jest.fn().mockRejectedValue(new Error("Insufficient inventory.")),
    })

    const result = await checkPaidCarts(deps)

    expect(deps.sendAlert).toHaveBeenCalledTimes(1)
    expect(deps.sendAlert).toHaveBeenCalledWith("owner@example.com", {
      cart_id: "cart_1",
      invoice_id: "inv_1",
      customer_email: "buyer@example.com",
      amount: 95000,
    })
    expect(deps.markAlertSent).toHaveBeenCalledWith("cart_1", "2026-10-02T12:00:00.000Z")
    expect(deps.logger.warn).toHaveBeenCalledWith(
      "The check-paid-carts job did not complete the paid cart cart_1. Cause: Insufficient inventory."
    )
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 1 })
  })

  it.each([
    ["a cart that already has an alert", { alertSentAt: "2026-10-02T11:00:00.000Z" }],
    ["a cart that is completed", { cartCompleted: true }],
    ["a session that is older than 48 hours", { createdAt: hoursAgo(49) }],
    ["a session with no cart", { cartId: undefined }],
    ["a session with no invoice id", { invoiceId: undefined }],
  ])("skips %s and does not call Mayar", async (_name, overrides) => {
    const deps = makeDeps([session(overrides)])

    const result = await checkPaidCarts(deps)

    expect(deps.isInvoicePaid).not.toHaveBeenCalled()
    expect(deps.completeCart).not.toHaveBeenCalled()
    expect(result).toEqual({ checked: 0, completed: 0, alerted: 0 })
  })

  it("checks a session that is 47 hours old", async () => {
    const deps = makeDeps([session({ createdAt: hoursAgo(47) })])
    expect((await checkPaidCarts(deps)).completed).toBe(1)
  })

  // Review Focus: a Mayar failure for one session must not stop the other sessions.
  it("continues with the next session when the Mayar check fails", async () => {
    const deps = makeDeps(
      [
        session({ sessionId: "payses_1", invoiceId: "inv_1", cartId: "cart_1" }),
        session({ sessionId: "payses_2", invoiceId: "inv_2", cartId: "cart_2" }),
      ],
      {
        isInvoicePaid: jest
          .fn()
          .mockRejectedValueOnce(new Error("The Mayar request failed."))
          .mockResolvedValueOnce(true),
      }
    )

    const result = await checkPaidCarts(deps)

    expect(deps.completeCart).toHaveBeenCalledTimes(1)
    expect(deps.completeCart).toHaveBeenCalledWith("cart_2")
    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(deps.logger.error).toHaveBeenCalledWith(
      "The check-paid-carts job did not check the Mayar invoice inv_1. Cause: The Mayar request failed."
    )
    expect(result).toEqual({ checked: 1, completed: 1, alerted: 0 })
  })

  // Review Focus: an alert that was not sent must be sent again in the next run.
  it("does not mark the cart when the alert email fails", async () => {
    const deps = makeDeps([session()], {
      completeCart: jest.fn().mockRejectedValue(new Error("Insufficient inventory.")),
      sendAlert: jest.fn().mockRejectedValue(new Error("Brevo is down.")),
    })

    const result = await checkPaidCarts(deps)

    expect(deps.markAlertSent).not.toHaveBeenCalled()
    expect(deps.logger.error).toHaveBeenCalledWith(
      "The check-paid-carts job did not send the alert for the cart cart_1. Cause: Brevo is down."
    )
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 0 })
  })

  it("writes the alert to the log when the owner email address is empty", async () => {
    const deps = makeDeps([session()], {
      ownerEmail: "",
      completeCart: jest.fn().mockRejectedValue(new Error("Insufficient inventory.")),
    })

    const result = await checkPaidCarts(deps)

    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(deps.markAlertSent).toHaveBeenCalledWith("cart_1", "2026-10-02T12:00:00.000Z")
    expect(deps.logger.error).toHaveBeenCalledWith(
      "The cart cart_1 is paid, but it has no order. Mayar invoice: inv_1. Amount: 95000. Customer: buyer@example.com. STORE_OWNER_EMAIL is empty, so the job sent no email."
    )
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 0 })
  })

  it("checks 40 sessions at most, the oldest first", async () => {
    const sessions = Array.from({ length: 45 }, (_, i) =>
      session({
        sessionId: `payses_${i}`,
        invoiceId: `inv_${i}`,
        cartId: `cart_${i}`,
        // The index 44 is the oldest session.
        createdAt: new Date(NOW.getTime() - (i + 1) * 60 * 1000),
      })
    )
    const isInvoicePaid = jest.fn().mockResolvedValue(false)
    const deps = makeDeps(sessions, { isInvoicePaid })

    const result = await checkPaidCarts(deps)

    expect(result.checked).toBe(40)
    expect(isInvoicePaid.mock.calls[0][0]).toBe("inv_44")
    expect(isInvoicePaid.mock.calls[39][0]).toBe("inv_5")
  })
})
