import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import checkPaidCartsJob, { config } from "../check-paid-carts"

const makeContainer = () => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const resolve = jest.fn((key: string) => {
    if (key === ContainerRegistrationKeys.LOGGER) {
      return logger
    }
    throw new Error(`The test container has no ${key}.`)
  })
  return { container: { resolve } as any, resolve, logger }
}

describe("check-paid-carts job", () => {
  it("runs each 15 minutes", () => {
    expect(config).toEqual({ name: "check-paid-carts", schedule: "*/15 * * * *" })
  })

  // The Medusa job loader calls the handler with the container and a context object.
  it("returns at once with the empty adapter list when the scheduler runs it", async () => {
    const { container, resolve, logger } = makeContainer()

    await (checkPaidCartsJob as (...args: unknown[]) => Promise<void>)(container, {
      scheduledFor: new Date(),
    })

    expect(resolve).not.toHaveBeenCalled()
    expect(logger.info).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })
})
