import cancelUnpaidOrdersJob, { config } from "../cancel-unpaid-orders"
import { runPaymentTimeout } from "../../payment-timeout/run"

jest.mock("../../payment-timeout/run", () => ({
  runPaymentTimeout: jest.fn().mockResolvedValue({ cancelled: [], failed: [] }),
}))

describe("cancel-unpaid-orders job", () => {
  it("runs each 15 minutes", () => {
    expect(config).toEqual({ name: "cancel-unpaid-orders", schedule: "*/15 * * * *" })
  })

  // The Medusa job loader calls the handler with the container and a context object.
  it("gives only the container to the payment timeout when the scheduler runs it", async () => {
    const container = { resolve: jest.fn() }

    await (cancelUnpaidOrdersJob as (...args: unknown[]) => Promise<void>)(container, {
      scheduledFor: new Date(),
    })

    expect(runPaymentTimeout).toHaveBeenCalledTimes(1)
    expect(runPaymentTimeout).toHaveBeenCalledWith(container)
  })

  it("logs a failed run and does not throw", async () => {
    const logger = { error: jest.fn() }
    const container = { resolve: jest.fn(() => logger) }
    jest.mocked(runPaymentTimeout).mockRejectedValueOnce(new Error("database down"))

    await expect(cancelUnpaidOrdersJob(container as never)).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledWith(
      "The cancel-unpaid-orders job failed. Cause: database down"
    )
  })
})
