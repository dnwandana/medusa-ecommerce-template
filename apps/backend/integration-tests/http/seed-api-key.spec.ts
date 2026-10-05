import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { seedRegion } from "../../src/seed/region"
import { seedPublishableKey } from "../../src/seed/api-key"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const publishableKeys = () =>
      getContainer()
        .resolve(ContainerRegistrationKeys.QUERY)
        .graph({
          entity: "api_key",
          fields: ["id", "title", "type", "sales_channels.name"],
          filters: { type: "publishable" },
        })
        .then((result: any) => result.data)

    describe("seedPublishableKey", () => {
      it("creates a publishable key with a link to the sales channel", async () => {
        const { salesChannelId } = await seedRegion(getContainer())

        const { token } = await seedPublishableKey(getContainer(), { salesChannelId })

        expect(token).toMatch(/^pk_[A-Za-z0-9]+$/)
        const keys = await publishableKeys()
        expect(keys).toHaveLength(1)
        expect(keys[0].title).toBe("Storefront")
        expect(keys[0].sales_channels.map((c: any) => c.name)).toEqual(["Default Sales Channel"])
      })

      it("returns a token that the Store API accepts", async () => {
        const { salesChannelId } = await seedRegion(getContainer())
        const { token } = await seedPublishableKey(getContainer(), { salesChannelId })

        const response = await api.get("/store/regions", {
          headers: { "x-publishable-api-key": token },
        })

        expect(response.status).toBe(200)
        expect(response.data.regions.map((r: any) => r.name)).toEqual(["Indonesia"])
      })

      it("returns the same full token on a second run", async () => {
        const { salesChannelId } = await seedRegion(getContainer())
        const first = await seedPublishableKey(getContainer(), { salesChannelId })
        const second = await seedPublishableKey(getContainer(), { salesChannelId })

        expect(second.token).toBe(first.token)
        expect(await publishableKeys()).toHaveLength(1)
      })
    })
  },
})
