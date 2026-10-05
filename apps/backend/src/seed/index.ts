import type { MedusaContainer } from "@medusajs/framework/types"
import { seedPublishableKey } from "./api-key"
import { seedFulfillment } from "./fulfillment"
import { seedProducts } from "./products"
import { seedRegion } from "./region"

export type SeedResult = { publishableKey: string; regionId: string; shippingOptionId: string }

// Runs all seed parts in sequence. It is safe to run again.
export async function runSeed(container: MedusaContainer): Promise<SeedResult> {
  const { salesChannelId, regionId } = await seedRegion(container)
  const { stockLocationId, shippingProfileId, shippingOptionId } = await seedFulfillment(
    container,
    { salesChannelId }
  )
  await seedProducts(container, { salesChannelId, shippingProfileId, stockLocationId })
  const { token } = await seedPublishableKey(container, { salesChannelId })

  return { publishableKey: token, regionId, shippingOptionId }
}
