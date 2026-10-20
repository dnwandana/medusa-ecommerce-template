import reviewRequestsJob, { config } from "../review-requests"
import { runReviewRequests } from "../../review-request/run"

jest.mock("../../review-request/run", () => ({
  runReviewRequests: jest.fn().mockResolvedValue({ sent: [], skipped: [], failed: [] }),
}))

describe("review-requests job", () => {
  it("runs each day at 20:00 UTC", () => {
    expect(config).toEqual({ name: "review-requests", schedule: "0 20 * * *" })
  })

  // The Medusa job loader calls the handler with the container and a context object.
  it("gives only the container to the run when the scheduler runs it", async () => {
    const container = { resolve: jest.fn() }

    await (reviewRequestsJob as (...args: unknown[]) => Promise<void>)(container, {
      scheduledFor: new Date(),
    })

    expect(runReviewRequests).toHaveBeenCalledTimes(1)
    expect(runReviewRequests).toHaveBeenCalledWith(container)
  })

  it("logs a failed run and does not throw", async () => {
    const logger = { error: jest.fn() }
    const container = { resolve: jest.fn(() => logger) }
    jest.mocked(runReviewRequests).mockRejectedValueOnce(new Error("database down"))

    await expect(reviewRequestsJob(container as never)).resolves.toBeUndefined()

    expect(logger.error).toHaveBeenCalledWith(
      "The review-requests job failed. Cause: database down"
    )
  })
})
