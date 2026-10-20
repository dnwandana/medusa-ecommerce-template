import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runReviewRequests } from "../review-request/run"

// Sends the review request 7 days after the delivery of an order. The Medusa job loader calls the
// handler with a context object as the second argument, so the handler reads only the container.
export default async function reviewRequestsJob(container: MedusaContainer): Promise<void> {
  try {
    await runReviewRequests(container)
  } catch (error) {
    // An error of one order does not come here. Only a failed read stops the run.
    const cause = error instanceof Error ? error.message : String(error)
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`The review-requests job failed. Cause: ${cause}`)
  }
}

// The schedule is in UTC. 20:00 UTC is 03:00 WIB (Jakarta time).
export const config = {
  name: "review-requests",
  schedule: "0 20 * * *",
}
