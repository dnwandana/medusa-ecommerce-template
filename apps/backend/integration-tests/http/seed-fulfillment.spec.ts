import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { seedRegion } from "../../src/seed/region"
import { seedFulfillment } from "../../src/seed/fulfillment"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    const graph = (entity: string, fields: string[]) =>
      getContainer()
        .resolve(ContainerRegistrationKeys.QUERY)
        .graph({ entity, fields })
        .then((result: any) => result.data)

    const seed = async () => {
      const { salesChannelId } = await seedRegion(getContainer())
      return seedFulfillment(getContainer(), { salesChannelId })
    }

    describe("seedFulfillment", () => {
      it("creates one calculated shipping option for the weight-shipping provider", async () => {
        const result = await seed()

        const options = await graph("shipping_option", [
          "id",
          "name",
          "price_type",
          "provider_id",
          "data",
          "shipping_profile_id",
          "service_zone.name",
          "service_zone.geo_zones.country_code",
          "type.code",
        ])
        expect(options).toHaveLength(1)
        expect(options[0]).toEqual(
          expect.objectContaining({
            id: result.shippingOptionId,
            name: "Standard Shipping",
            price_type: "calculated",
            provider_id: "weight-shipping_weight-shipping",
            data: { id: "weight-shipping" },
            shipping_profile_id: result.shippingProfileId,
          })
        )
        expect(options[0].service_zone.name).toBe("Indonesia")
        expect(options[0].service_zone.geo_zones.map((z: any) => z.country_code)).toEqual(["id"])
        expect(options[0].type.code).toBe("standard")
      })

      it("creates the warehouse and links it to the sales channel", async () => {
        const result = await seed()

        const locations = await graph("stock_location", [
          "id",
          "name",
          "address.city",
          "address.country_code",
          "sales_channels.name",
          "fulfillment_providers.id",
          "fulfillment_sets.name",
        ])
        expect(locations).toHaveLength(1)
        expect(locations[0].id).toBe(result.stockLocationId)
        expect(locations[0].name).toBe("Jakarta Warehouse")
        expect(locations[0].address.city).toBe("Jakarta")
        expect(locations[0].address.country_code.toLowerCase()).toBe("id")
        expect(locations[0].sales_channels.map((c: any) => c.name)).toEqual([
          "Default Sales Channel",
        ])
        expect(locations[0].fulfillment_providers.map((p: any) => p.id)).toEqual([
          "weight-shipping_weight-shipping",
        ])
        expect(locations[0].fulfillment_sets.map((s: any) => s.name)).toEqual([
          "Jakarta Warehouse delivery",
        ])
      })

      it("is safe to run again", async () => {
        const { salesChannelId } = await seedRegion(getContainer())
        const first = await seedFulfillment(getContainer(), { salesChannelId })
        const second = await seedFulfillment(getContainer(), { salesChannelId })

        expect(second).toEqual(first)
        expect(await graph("stock_location", ["id"])).toHaveLength(1)
        expect(await graph("fulfillment_set", ["id"])).toHaveLength(1)
        expect(await graph("shipping_option", ["id"])).toHaveLength(1)
      })
    })
  },
})
