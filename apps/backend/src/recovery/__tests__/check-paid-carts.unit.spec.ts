import { RECOVERY_ADAPTERS, RecoveryAdapter } from "../adapters"
import { checkPaidCarts, MAX_SESSION_AGE_MS, PendingSession } from "../check-paid-carts"

const NOW = new Date("2026-10-02T12:00:00.000Z")
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000)

const session = (overrides: Partial<PendingSession> = {}): PendingSession => ({
  sessionId: "payses_1",
  data: { ref: "ref-1" },
  amount: 150000,
  createdAt: hoursAgo(1),
  cartId: "cart_1",
  cartCompleted: false,
  customerEmail: "buyer@example.com",
  ...overrides,
})

type AdapterOverrides = Partial<Omit<RecoveryAdapter, "isSessionPaid">> & {
  isSessionPaid?: jest.Mock
}

type DepsOverrides = {
  readOwnerEmail?: jest.Mock
  completeCart?: jest.Mock
  sendAlert?: jest.Mock
}

const makeAdapter = (overrides: AdapterOverrides = {}) => ({
  providerId: "pp_test_test",
  maxSessionsPerRun: 40,
  isSessionPaid: jest.fn().mockResolvedValue(true),
  paymentReference: (data: Record<string, unknown>) => data.ref as string,
  ...overrides,
})

const makeDeps = (
  adapters: RecoveryAdapter[],
  sessionsByProvider: Record<string, PendingSession[]>,
  overrides: DepsOverrides = {}
) => {
  const deps = {
    now: () => NOW,
    readOwnerEmail: jest.fn().mockResolvedValue("owner@example.com"),
    adapters,
    listPendingSessions: jest.fn(
      async (providerId: string) => sessionsByProvider[providerId] ?? []
    ),
    completeCart: jest.fn().mockResolvedValue(undefined),
    sendAlert: jest.fn().mockResolvedValue(undefined),
    markAlertSent: jest.fn().mockResolvedValue(undefined),
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    ...overrides,
  }
  return deps
}

const failedCompletion = () => jest.fn().mockRejectedValue(new Error("Insufficient inventory."))

describe("checkPaidCarts", () => {
  it("has a maximum session age of 48 hours", () => {
    expect(MAX_SESSION_AGE_MS).toBe(48 * 60 * 60 * 1000)
  })

  it("has an empty adapter list in the template", () => {
    expect(RECOVERY_ADAPTERS).toEqual([])
  })

  it("returns at once and logs nothing at info with an empty adapter list", async () => {
    const deps = makeDeps([], {})

    expect(await checkPaidCarts(deps)).toEqual({ checked: 0, completed: 0, alerted: 0 })
    expect(deps.listPendingSessions).not.toHaveBeenCalled()
    expect(deps.logger.info).not.toHaveBeenCalled()
  })

  it("completes the cart of a paid session", async () => {
    const adapter = makeAdapter()
    const deps = makeDeps([adapter], { pp_test_test: [session()] })

    const result = await checkPaidCarts(deps)

    expect(adapter.isSessionPaid).toHaveBeenCalledWith({ ref: "ref-1" })
    expect(deps.completeCart).toHaveBeenCalledWith("cart_1")
    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(result).toEqual({ checked: 1, completed: 1, alerted: 0 })
    expect(deps.logger.info).toHaveBeenCalledWith(
      "The check-paid-carts job completed the cart cart_1 for the paid payment session payses_1 of the provider pp_test_test."
    )
  })

  it("does nothing for a session that is not paid", async () => {
    const adapter = makeAdapter({ isSessionPaid: jest.fn().mockResolvedValue(false) })
    const deps = makeDeps([adapter], { pp_test_test: [session()] })

    const result = await checkPaidCarts(deps)

    expect(deps.completeCart).not.toHaveBeenCalled()
    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 0 })
  })

  it("sends one alert with the payment reference and marks the cart when the completion fails", async () => {
    const deps = makeDeps(
      [makeAdapter()],
      { pp_test_test: [session()] },
      {
        completeCart: failedCompletion(),
      }
    )

    const result = await checkPaidCarts(deps)

    expect(deps.sendAlert).toHaveBeenCalledTimes(1)
    expect(deps.sendAlert).toHaveBeenCalledWith("owner@example.com", {
      cart_id: "cart_1",
      provider_id: "pp_test_test",
      payment_reference: "ref-1",
      customer_email: "buyer@example.com",
      amount: 150000,
    })
    expect(deps.markAlertSent).toHaveBeenCalledWith("cart_1", "2026-10-02T12:00:00.000Z")
    expect(deps.logger.warn).toHaveBeenCalledWith(
      "The check-paid-carts job did not complete the paid cart cart_1. Cause: Insufficient inventory."
    )
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 1 })
  })

  it("uses the session id as the payment reference when the adapter has no paymentReference", async () => {
    const deps = makeDeps(
      [makeAdapter({ paymentReference: undefined })],
      { pp_test_test: [session()] },
      { completeCart: failedCompletion() }
    )

    await checkPaidCarts(deps)

    expect(deps.sendAlert.mock.calls[0][1].payment_reference).toBe("payses_1")
  })

  it.each([
    ["a cart that already has an alert", { alertSentAt: "2026-10-02T11:00:00.000Z" }],
    ["a cart that is completed", { cartCompleted: true }],
    ["a session with no cart", { cartId: undefined }],
  ])("skips %s and does not call the adapter", async (_name, overrides) => {
    const adapter = makeAdapter()
    const deps = makeDeps([adapter], { pp_test_test: [session(overrides)] })

    const result = await checkPaidCarts(deps)

    expect(adapter.isSessionPaid).not.toHaveBeenCalled()
    expect(deps.completeCart).not.toHaveBeenCalled()
    expect(result).toEqual({ checked: 0, completed: 0, alerted: 0 })
  })

  it("checks a session that is 47 hours old and skips one that is 49 hours old", async () => {
    const adapter = makeAdapter()
    const deps = makeDeps([adapter], {
      pp_test_test: [
        session({ sessionId: "payses_47", cartId: "cart_47", createdAt: hoursAgo(47) }),
        session({ sessionId: "payses_49", cartId: "cart_49", createdAt: hoursAgo(49) }),
      ],
    })

    const result = await checkPaidCarts(deps)

    expect(adapter.isSessionPaid).toHaveBeenCalledTimes(1)
    expect(deps.completeCart).toHaveBeenCalledWith("cart_47")
    expect(result).toEqual({ checked: 1, completed: 1, alerted: 0 })
  })

  // Review Focus: a failed paid check for one session must not stop the other sessions.
  it("continues with the next session when the paid check fails", async () => {
    const adapter = makeAdapter({
      isSessionPaid: jest
        .fn()
        .mockRejectedValueOnce(new Error("The request failed."))
        .mockResolvedValueOnce(true),
    })
    const deps = makeDeps([adapter], {
      pp_test_test: [
        session({ sessionId: "payses_1", cartId: "cart_1", createdAt: hoursAgo(2) }),
        session({ sessionId: "payses_2", cartId: "cart_2", createdAt: hoursAgo(1) }),
      ],
    })

    const result = await checkPaidCarts(deps)

    expect(deps.completeCart).toHaveBeenCalledTimes(1)
    expect(deps.completeCart).toHaveBeenCalledWith("cart_2")
    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(deps.logger.warn.mock.calls[0][0]).toContain("payses_1")
    expect(deps.logger.warn.mock.calls[0][0]).toContain("pp_test_test")
    expect(deps.logger.warn.mock.calls[0][0]).not.toMatch(/invoice/i)
    expect(result).toEqual({ checked: 1, completed: 1, alerted: 0 })
  })

  // Review Focus: one adapter that fails must not stop the sessions of the next adapter.
  it("continues with the next adapter when the session list of an adapter fails", async () => {
    const second = makeAdapter({ providerId: "pp_b_b" })
    const deps = makeDeps([makeAdapter({ providerId: "pp_a_a" }), second], {
      pp_b_b: [session()],
    })
    deps.listPendingSessions.mockRejectedValueOnce(new Error("The query failed."))

    const result = await checkPaidCarts(deps)

    expect(second.isSessionPaid).toHaveBeenCalledTimes(1)
    expect(deps.logger.error.mock.calls[0][0]).toContain("pp_a_a")
    expect(result).toEqual({ checked: 1, completed: 1, alerted: 0 })
  })

  // Review Focus: an alert that was not sent must be sent again in the next run.
  it("does not mark the cart when the alert email fails", async () => {
    const deps = makeDeps(
      [makeAdapter()],
      { pp_test_test: [session()] },
      {
        completeCart: failedCompletion(),
        sendAlert: jest.fn().mockRejectedValue(new Error("SMTP is down.")),
      }
    )

    const result = await checkPaidCarts(deps)

    expect(deps.markAlertSent).not.toHaveBeenCalled()
    expect(deps.logger.error).toHaveBeenCalledWith(
      "The check-paid-carts job did not send the alert for the cart cart_1. Cause: SMTP is down."
    )
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 0 })
  })

  it("writes the alert to the log when the owner email address is empty", async () => {
    const deps = makeDeps(
      [makeAdapter()],
      { pp_test_test: [session()] },
      {
        readOwnerEmail: jest.fn().mockResolvedValue(""),
        completeCart: failedCompletion(),
      }
    )

    const result = await checkPaidCarts(deps)

    expect(deps.sendAlert).not.toHaveBeenCalled()
    expect(deps.markAlertSent).toHaveBeenCalledWith("cart_1", "2026-10-02T12:00:00.000Z")
    expect(deps.logger.error).toHaveBeenCalledWith(
      "The cart cart_1 is paid, but it has no order. Payment provider: pp_test_test. Payment reference: ref-1. Amount: 150000. Customer: buyer@example.com. The owner email is empty, so the job sent no email."
    )
    expect(result).toEqual({ checked: 1, completed: 0, alerted: 0 })
  })

  it("checks maxSessionsPerRun sessions at most for each adapter, the oldest first", async () => {
    const adapter = makeAdapter({
      maxSessionsPerRun: 2,
      isSessionPaid: jest.fn().mockResolvedValue(false),
    })
    const deps = makeDeps([adapter], {
      pp_test_test: [
        session({ sessionId: "payses_new", data: { ref: "new" }, createdAt: hoursAgo(1) }),
        session({ sessionId: "payses_old", data: { ref: "old" }, createdAt: hoursAgo(3) }),
        session({ sessionId: "payses_mid", data: { ref: "mid" }, createdAt: hoursAgo(2) }),
      ],
    })

    const result = await checkPaidCarts(deps)

    expect(adapter.isSessionPaid).toHaveBeenCalledTimes(2)
    expect(adapter.isSessionPaid.mock.calls).toEqual([[{ ref: "old" }], [{ ref: "mid" }]])
    expect(result.checked).toBe(2)
  })

  it("lists the sessions of each adapter with its own provider id", async () => {
    const deps = makeDeps(
      [makeAdapter({ providerId: "pp_a_a" }), makeAdapter({ providerId: "pp_b_b" })],
      {}
    )

    await checkPaidCarts(deps)

    expect(deps.listPendingSessions.mock.calls).toEqual([["pp_a_a"], ["pp_b_b"]])
  })
})
