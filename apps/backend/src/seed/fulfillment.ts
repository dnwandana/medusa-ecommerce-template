import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

export type SeedFulfillmentResult = {
  stockLocationId: string
  shippingProfileId: string
  shippingOptionId: string
}

const PROVIDER_ID = "weight-shipping_weight-shipping"
const SHIPPING_PROFILE_NAME = "Default Shipping Profile"
const LOCATION_NAME = "Jakarta Warehouse"
const FULFILLMENT_SET_NAME = "Jakarta Warehouse delivery"
const SERVICE_ZONE_NAME = "Indonesia"
const COUNTRY = "id"
const SHIPPING_OPTION_NAME = "Standard Shipping"

type StockLocationRecord = {
  id: string
  sales_channels?: { id: string }[] | null
  fulfillment_providers?: { id: string }[] | null
  fulfillment_sets?: { id: string }[] | null
}

// Creates the warehouse, the service zone for Indonesia, and the calculated shipping option.
// Each step looks for the record or the link first, so a second run creates nothing.
export async function seedFulfillment(
  container: MedusaContainer,
  input: { salesChannelId: string }
): Promise<SeedFulfillmentResult> {
  const shippingProfileId = await findOrCreateShippingProfile(container)
  const location = await findOrCreateStockLocation(container)
  const { fulfillmentSetId, serviceZoneId } = await findOrCreateFulfillmentSet(container)
  await linkStockLocation(container, location, {
    fulfillmentSetId,
    salesChannelId: input.salesChannelId,
  })
  const shippingOptionId = await findOrCreateShippingOption(container, {
    serviceZoneId,
    shippingProfileId,
  })

  return { stockLocationId: location.id, shippingProfileId, shippingOptionId }
}

// Uses the first default profile, because Medusa permits only one default profile.
async function findOrCreateShippingProfile(container: MedusaContainer): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
    filters: { type: "default" },
  })
  if (profiles.length > 0) {
    return profiles[0].id
  }

  const { result } = await createShippingProfilesWorkflow(container).run({
    input: { data: [{ name: SHIPPING_PROFILE_NAME, type: "default" }] },
  })
  return result[0].id
}

async function findOrCreateStockLocation(
  container: MedusaContainer
): Promise<StockLocationRecord> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "sales_channels.id", "fulfillment_providers.id", "fulfillment_sets.id"],
    filters: { name: LOCATION_NAME },
  })
  if (locations.length > 0) {
    return locations[0] as StockLocationRecord
  }

  const { result } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: LOCATION_NAME,
          address: { city: "Jakarta", country_code: COUNTRY.toUpperCase(), address_1: "" },
        },
      ],
    },
  })
  return { id: result[0].id }
}

async function findOrCreateFulfillmentSet(
  container: MedusaContainer
): Promise<{ fulfillmentSetId: string; serviceZoneId: string }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: sets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id"],
    filters: { name: FULFILLMENT_SET_NAME },
  })
  if (sets.length > 0) {
    return { fulfillmentSetId: sets[0].id, serviceZoneId: sets[0].service_zones[0].id }
  }

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const fulfillmentSet = await fulfillmentService.createFulfillmentSets({
    name: FULFILLMENT_SET_NAME,
    type: "shipping",
    service_zones: [
      { name: SERVICE_ZONE_NAME, geo_zones: [{ country_code: COUNTRY, type: "country" }] },
    ],
  })
  return {
    fulfillmentSetId: fulfillmentSet.id,
    serviceZoneId: fulfillmentSet.service_zones[0].id,
  }
}

// Creates only the links that do not exist, so a second run creates no second link.
async function linkStockLocation(
  container: MedusaContainer,
  location: StockLocationRecord,
  input: { fulfillmentSetId: string; salesChannelId: string }
): Promise<void> {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const has = (records: { id: string }[] | null | undefined, id: string) =>
    (records ?? []).some((record) => record?.id === id)

  if (!has(location.fulfillment_providers, PROVIDER_ID)) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: PROVIDER_ID },
    })
  }

  if (!has(location.fulfillment_sets, input.fulfillmentSetId)) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: location.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: input.fulfillmentSetId },
    })
  }

  if (!has(location.sales_channels, input.salesChannelId)) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [input.salesChannelId] },
    })
  }
}

// The option has no prices, because the weight-shipping provider calculates the price.
async function findOrCreateShippingOption(
  container: MedusaContainer,
  input: { serviceZoneId: string; shippingProfileId: string }
): Promise<string> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id"],
    filters: { name: SHIPPING_OPTION_NAME, service_zone_id: input.serviceZoneId },
  })
  if (options.length > 0) {
    return options[0].id
  }

  const { result } = await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: SHIPPING_OPTION_NAME,
        price_type: "calculated",
        provider_id: PROVIDER_ID,
        service_zone_id: input.serviceZoneId,
        shipping_profile_id: input.shippingProfileId,
        data: { id: "weight-shipping" },
        type: { label: "Standard", description: "IDR 10,000 per kilogram.", code: "standard" },
        // Without the enabled_in_store rule, the Store API does not list the option.
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })
  return result[0].id
}
