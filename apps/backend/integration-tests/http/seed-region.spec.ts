import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { seedRegion } from "../../src/seed/region"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    const graph = (entity: string, fields: string[]) =>
      getContainer()
        .resolve(ContainerRegistrationKeys.QUERY)
        .graph({ entity, fields })
        .then((result: any) => result.data)

    describe("seedRegion", () => {
      it("creates the Indonesia region in IDR", async () => {
        const result = await seedRegion(getContainer())

        const regions = await graph("region", [
          "id",
          "name",
          "currency_code",
          "countries.iso_2",
          "payment_providers.id",
        ])
        expect(regions).toHaveLength(1)
        expect(regions[0].id).toBe(result.regionId)
        expect(regions[0].name).toBe("Indonesia")
        expect(regions[0].currency_code).toBe("idr")
        expect(regions[0].countries.map((c: any) => c.iso_2)).toEqual(["id"])
        expect(regions[0].payment_providers.map((p: any) => p.id)).toEqual(["pp_mayar_mayar"])
      })

      it("sets IDR as the only store currency and links the sales channel", async () => {
        const result = await seedRegion(getContainer())

        const stores = await graph("store", [
          "id",
          "default_sales_channel_id",
          "supported_currencies.currency_code",
          "supported_currencies.is_default",
        ])
        expect(stores).toHaveLength(1)
        expect(stores[0].id).toBe(result.storeId)
        expect(stores[0].default_sales_channel_id).toBe(result.salesChannelId)
        expect(stores[0].supported_currencies).toEqual([
          expect.objectContaining({ currency_code: "idr", is_default: true }),
        ])
      })

      it("creates no tax region", async () => {
        await seedRegion(getContainer())
        expect(await graph("tax_region", ["id"])).toHaveLength(0)
      })

      it("is safe to run again", async () => {
        const first = await seedRegion(getContainer())
        const second = await seedRegion(getContainer())

        expect(second).toEqual(first)
        expect(await graph("region", ["id"])).toHaveLength(1)
        expect(await graph("store", ["id"])).toHaveLength(1)
        const channels = await graph("sales_channel", ["id", "name"])
        expect(channels.filter((c: any) => c.name === "Default Sales Channel")).toHaveLength(1)
      })

      it("replaces the payment provider of a region that exists", async () => {
        await createRegionsWorkflow(getContainer()).run({
          input: {
            regions: [
              {
                name: "Indonesia",
                currency_code: "idr",
                countries: ["id"],
                payment_providers: ["pp_system_default"],
              },
            ],
          },
        })

        await seedRegion(getContainer())

        const regions = await graph("region", ["id", "payment_providers.id"])
        expect(regions).toHaveLength(1)
        expect(regions[0].payment_providers.map((p: any) => p.id)).toEqual(["pp_mayar_mayar"])
      })
    })
  },
})
