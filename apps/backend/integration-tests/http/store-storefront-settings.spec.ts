import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/storefront/settings", () => {
      it("returns the saved settings and the colour list without ids", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const admin = await createAdminWithToken(getContainer())
        await api.post(
          "/admin/storefront/colours",
          { name: "Olive", hex: "#6b7a3a" },
          { headers: admin.headers }
        )
        await api.post(
          "/admin/storefront/settings",
          { new_badge_days: 14, low_stock_threshold: 0, price_limits: [200000] },
          { headers: admin.headers }
        )

        const response = await api.get("/store/storefront/settings", { headers })

        expect(response.status).toBe(200)
        expect(response.data).toMatchObject({
          new_badge_days: 14,
          low_stock_threshold: 0,
          price_limits: [200000],
        })
        expect(response.data.colours).toContainEqual({ name: "Olive", hex: "#6b7a3a" })
        for (const colour of response.data.colours) {
          expect(Object.keys(colour).sort()).toEqual(["hex", "name"])
        }
      })

      // Review Focus: staff save price limits with a duplicate or in the wrong order.
      it("returns sorted price limits with no duplicate", async () => {
        const seed = await runSeed(getContainer())
        const admin = await createAdminWithToken(getContainer())
        await api.post(
          "/admin/storefront/settings",
          { new_badge_days: 30, low_stock_threshold: 5, price_limits: [500000, 200000, 500000] },
          { headers: admin.headers }
        )
        const response = await api.get("/store/storefront/settings", {
          headers: { "x-publishable-api-key": seed.publishableKey },
        })
        expect(response.data.price_limits).toEqual([200000, 500000])
      })

      it("rejects a request with no publishable key", async () => {
        const response = await api.get("/store/storefront/settings").catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })
    })
  },
})
