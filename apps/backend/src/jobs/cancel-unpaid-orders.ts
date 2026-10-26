import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runPaymentTimeout } from "../payment-timeout/run"

// Cancels each unpaid bank transfer order with no receipt after the deadline of
// BANK_TRANSFER_DEADLINE_HOURS. The Medusa job loader calls the handler with a context object as
// the second argument, so the handler reads only the container.
export default async function cancelUnpaidOrdersJob(container: MedusaContainer): Promise<void> {
  try {
    await runPaymentTimeout(container)
  } catch (error) {
    // An error of one order does not come here. Only a failed read stops the run.
    const cause = error instanceof Error ? error.message : String(error)
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`The cancel-unpaid-orders job failed. Cause: ${cause}`)
  }
}

export const config = {
  name: "cancel-unpaid-orders",
  schedule: "*/15 * * * *",
}
