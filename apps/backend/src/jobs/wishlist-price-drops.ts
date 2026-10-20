import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runPriceDrops } from "../wishlist-alerts/run"

// Sends one email to each customer with a lower price on a wishlist item. The Medusa job loader
// calls the handler with a context object as the second argument, so the handler reads only the
// container.
export default async function wishlistPriceDropsJob(container: MedusaContainer): Promise<void> {
  try {
    await runPriceDrops(container)
  } catch (error) {
    // An error of one customer does not come here. Only a failed read stops the run.
    const cause = error instanceof Error ? error.message : String(error)
    container
      .resolve(ContainerRegistrationKeys.LOGGER)
      .error(`The wishlist-price-drops job failed. Cause: ${cause}`)
  }
}

// The schedule is in UTC. 21:00 UTC is 04:00 WIB (Jakarta time).
export const config = {
  name: "wishlist-price-drops",
  schedule: "0 21 * * *",
}
