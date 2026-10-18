import type { MedusaContainer } from "@medusajs/framework/types"
import { seedPublishableKey } from "./api-key"
import { seedBankAccount } from "./bank-account"
import { seedFulfillment } from "./fulfillment"
import { seedProducts } from "./products"
import { seedRegion } from "./region"
import { seedStorefront } from "./storefront"

export type SeedResult = { publishableKey: string; regionId: string; shippingOptionId: string }

// Runs all seed parts in sequence. It is safe to run again.
export async function runSeed(container: MedusaContainer): Promise<SeedResult> {
  const { salesChannelId, regionId } = await seedRegion(container)
  await seedBankAccount(container)
  const { stockLocationId, shippingProfileId, shippingOptionId } = await seedFulfillment(
    container,
    { salesChannelId }
  )
  await seedProducts(container, { salesChannelId, shippingProfileId, stockLocationId })
  await seedStorefront(container)
  const { token } = await seedPublishableKey(container, { salesChannelId })

  return { publishableKey: token, regionId, shippingOptionId }
}
