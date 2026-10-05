import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { checkPaidCarts } from "../recovery/check-paid-carts"
import { buildRecoveryDeps } from "../recovery/dependencies"

// Completes each cart that a customer paid, but that has no order.
export default async function checkPaidCartsJob(container: MedusaContainer): Promise<void> {
  // The job runs each 15 minutes, so an empty key gives no log line.
  if (!process.env.MAYAR_API_KEY) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const { checked, completed, alerted } = await checkPaidCarts(
      buildRecoveryDeps(container, process.env)
    )
    if (completed > 0 || alerted > 0) {
      logger.info(
        `The check-paid-carts job checked ${checked} payment sessions, completed ${completed} carts, and sent ${alerted} alerts.`
      )
    }
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The check-paid-carts job failed. Cause: ${cause}`)
  }
}

export const config = {
  name: "check-paid-carts",
  schedule: "*/15 * * * *",
}
