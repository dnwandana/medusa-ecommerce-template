import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("/admin/storefront/settings", () => {
      it("returns the defaults first and then the saved values", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        expect((await api.get("/admin/storefront/settings", { headers })).data.settings).toEqual({
          new_badge_days: 30,
          low_stock_threshold: 5,
          price_limits: [],
        })

        const saved = await api.post(
          "/admin/storefront/settings",
          { new_badge_days: 0, low_stock_threshold: 3, price_limits: [500000, 200000, 500000] },
          { headers }
        )
        expect(saved.data.settings).toEqual({
          new_badge_days: 0,
          low_stock_threshold: 3,
          price_limits: [200000, 500000],
        })
      })

      it.each([
        { new_badge_days: 366, low_stock_threshold: 5, price_limits: [] },
        { new_badge_days: 30, low_stock_threshold: 1000, price_limits: [] },
        { new_badge_days: 30, low_stock_threshold: 5, price_limits: [0] },
        { new_badge_days: 1.5, low_stock_threshold: 5, price_limits: [] },
        { new_badge_days: 30, low_stock_threshold: 5, price_limits: [], extra: true },
      ])("rejects %o with 400", async (body) => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/storefront/settings", body, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("rejects a request with no admin login", async () => {
        const response = await api.get("/admin/storefront/settings").catch((e: any) => e.response)
        expect(response.status).toBe(401)
      })
    })
  },
})
