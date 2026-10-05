import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStoresWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

export type SeedRegionResult = { salesChannelId: string; storeId: string; regionId: string }

const SALES_CHANNEL_NAME = "Default Sales Channel"
const STORE_NAME = "My Store"
const REGION_NAME = "Indonesia"
const CURRENCY = "idr"
const COUNTRY = "id"
// The region does not use the system default provider. That provider authorizes each payment with
// no money.
const PAYMENT_PROVIDERS = ["pp_mayar_mayar"]

// Creates the sales channel, the store currency, and the region. The region uses the Mayar
// provider pp_mayar_mayar as its only payment provider. It creates no tax region, because the
// store calculates no tax. Each step looks for the record first, so a second run creates no
// record.
export async function seedRegion(container: MedusaContainer): Promise<SeedRegionResult> {
  const salesChannelId = await findOrCreateSalesChannel(container)
  const storeId = await upsertStore(container, salesChannelId)
  const regionId = await findOrCreateRegion(container)
  return { salesChannelId, storeId, regionId }
}

async function findOrCreateSalesChannel(container: MedusaContainer): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    filters: { name: SALES_CHANNEL_NAME },
  })
  if (channels.length > 0) {
    return channels[0].id
  }

  const { result } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [{ name: SALES_CHANNEL_NAME, description: "Created by the seed" }],
    },
  })
  return result[0].id
}

// A database can have a default store or no store. The function updates the store if it exists.
async function upsertStore(container: MedusaContainer, salesChannelId: string): Promise<string> {
  const storeService = container.resolve(Modules.STORE)
  const [store] = await storeService.listStores()
  const storeData = {
    supported_currencies: [{ currency_code: CURRENCY, is_default: true }],
    default_sales_channel_id: salesChannelId,
  }

  if (store) {
    await updateStoresWorkflow(container).run({
      input: { selector: { id: store.id }, update: storeData },
    })
    return store.id
  }

  const { result } = await createStoresWorkflow(container).run({
    input: { stores: [{ name: STORE_NAME, ...storeData }] },
  })
  return result[0].id
}

async function findOrCreateRegion(container: MedusaContainer): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id"],
    filters: { name: REGION_NAME },
  })
  if (regions.length > 0) {
    const regionId: string = regions[0].id
    // A database from an earlier seed can have a different provider, so set the provider again.
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: regionId }, update: { payment_providers: PAYMENT_PROVIDERS } },
    })
    return regionId
  }

  const { result } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: REGION_NAME,
          currency_code: CURRENCY,
          countries: [COUNTRY],
          payment_providers: PAYMENT_PROVIDERS,
        },
      ],
    },
  })
  return result[0].id
}
