import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RECOVERY_ADAPTERS, type RecoveryAdapter } from "../recovery/adapters"
import { checkPaidCarts } from "../recovery/check-paid-carts"
import { buildRecoveryDeps } from "../recovery/dependencies"

// Completes each cart that a customer paid, but that has no order. The Medusa job loader calls
// the handler with a context object as the second argument, so the adapters are not a parameter
// of the handler.
export default async function checkPaidCartsJob(container: MedusaContainer): Promise<void> {
  await runCheckPaidCarts(container, RECOVERY_ADAPTERS)
}

// Runs the check with the given adapters. The integration tests give a test adapter.
export async function runCheckPaidCarts(
  container: MedusaContainer,
  adapters: RecoveryAdapter[]
): Promise<void> {
  // The template has no gateway, so the adapter list is empty. The job runs each 15 minutes, so it
  // returns before it writes a log line.
  if (adapters.length === 0) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  try {
    const { checked, completed, alerted } = await checkPaidCarts(
      buildRecoveryDeps(container, process.env, adapters)
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
