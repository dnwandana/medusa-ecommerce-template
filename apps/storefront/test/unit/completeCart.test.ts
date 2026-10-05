import { describe, expect, it, vi } from "vitest"
import {
  completeCartWithRetry,
  RETURN_DELAY_MS,
  RETURN_RETRIES,
} from "../../app/utils/completeCart"

const order = { id: "order_1" }
const orderResult = { type: "order", order } as never
const cartResult = {
  type: "cart",
  cart: { id: "cart_1" },
  error: { message: "Payment is not authorized", name: "Error", type: "payment_authorization_error" },
} as never

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

describe("completeCartWithRetry", () => {
  it("returns the order of the first attempt and does not wait", async () => {
    const complete = vi.fn().mockResolvedValue(orderResult)
    const wait = vi.fn().mockResolvedValue(undefined)

    const result = await completeCartWithRetry({ complete, wait })

    expect(result).toEqual({ status: "order", order })
    expect(complete).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })

  // Review Focus: the customer returns before the webhook. The page tries again.
  it("tries again when the payment is not authorized yet", async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce(cartResult)
      .mockResolvedValueOnce(cartResult)
      .mockResolvedValueOnce(orderResult)
    const wait = vi.fn().mockResolvedValue(undefined)

    const result = await completeCartWithRetry({ complete, wait })

    expect(result).toEqual({ status: "order", order })
    expect(complete).toHaveBeenCalledTimes(3)
    expect(wait).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledWith(RETURN_DELAY_MS)
  })

  // Review Focus: the retry has a limit. The result is "pending", not "failed".
  it("returns pending after the last retry", async () => {
    const complete = vi.fn().mockResolvedValue(cartResult)
    const wait = vi.fn().mockResolvedValue(undefined)

    const result = await completeCartWithRetry({ complete, wait })

    expect(result).toEqual({ status: "pending" })
    expect(complete).toHaveBeenCalledTimes(RETURN_RETRIES + 1)
    expect(wait).toHaveBeenCalledTimes(RETURN_RETRIES)
  })

  // Review Focus: the webhook and the return page can complete the cart at the same time.
  it("tries again after a conflict with a second completion", async () => {
    const complete = vi
      .fn()
      .mockRejectedValueOnce(httpError(409))
      .mockResolvedValueOnce(orderResult)
    const wait = vi.fn().mockResolvedValue(undefined)

    const result = await completeCartWithRetry({ complete, wait })

    expect(result).toEqual({ status: "order", order })
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it("tries again after a network error", async () => {
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(orderResult)
    const wait = vi.fn().mockResolvedValue(undefined)

    const result = await completeCartWithRetry({ complete, wait })

    expect(result).toEqual({ status: "order", order })
  })

  it("returns failed at once for a different HTTP error", async () => {
    const complete = vi.fn().mockRejectedValue(httpError(500))
    const wait = vi.fn().mockResolvedValue(undefined)

    const result = await completeCartWithRetry({ complete, wait })

    expect(result).toEqual({ status: "failed" })
    expect(complete).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })

  it("uses the given number of retries and the given delay", async () => {
    const complete = vi.fn().mockResolvedValue(cartResult)
    const wait = vi.fn().mockResolvedValue(undefined)

    const result = await completeCartWithRetry({ complete, wait, retries: 1, delayMs: 10 })

    expect(result).toEqual({ status: "pending" })
    expect(complete).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledTimes(1)
    expect(wait).toHaveBeenCalledWith(10)
  })
})
