import type { MedusaContainer } from "@medusajs/framework/types"
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { EMPTY_CONTACT } from "../../src/lib/store-contact"
import { STOREFRONT_MODULE } from "../../src/modules/storefront"
import type StorefrontModuleService from "../../src/modules/storefront/service"
import { runSeed } from "../../src/seed"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

// Returns the headers with a new publishable key. The seed also writes a sample contact, so a
// test of the empty contact gets the key without the seed.
async function publishableHeaders(container: MedusaContainer) {
  const { result } = await createApiKeysWorkflow(container).run({
    input: { api_keys: [{ title: "Test", type: "publishable", created_by: "" }] },
  })
  return { "x-publishable-api-key": result[0].token }
}

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

      it("returns the empty contact when the owner saved none", async () => {
        const headers = await publishableHeaders(getContainer())

        const response = await api.get("/store/storefront/settings", { headers })

        expect(response.status).toBe(200)
        expect(response.data.contact).toEqual({
          email: null,
          phone: null,
          whatsapp: null,
          address: null,
          social_links: [],
        })
      })

      it("returns the saved contact with the links in order", async () => {
        const headers = await publishableHeaders(getContainer())
        const admin = await createAdminWithToken(getContainer())
        const contact = {
          email: "hello@shop.id",
          phone: "+622155500100",
          whatsapp: "+6281234567890",
          address: "Jl. Sudirman 1\nJakarta",
          social_links: [
            { network: "tiktok", url: "https://www.tiktok.com/@shop" },
            { network: "instagram", url: "https://instagram.com/shop" },
          ],
        }
        await api.post("/admin/store-contact", contact, { headers: admin.headers })

        const response = await api.get("/store/storefront/settings", { headers })

        expect(response.data.contact).toEqual(contact)
      })

      // Review Focus: a saved link of a network that a later code change removed.
      it("drops a link whose network is not in the list", async () => {
        const headers = await publishableHeaders(getContainer())
        const service: StorefrontModuleService = getContainer().resolve(STOREFRONT_MODULE)
        await service.setContact({
          ...EMPTY_CONTACT,
          social_links: [
            { network: "myspace", url: "https://myspace.com/a" },
            { network: "instagram", url: "https://instagram.com/a" },
          ],
        })

        const response = await api.get("/store/storefront/settings", { headers })

        expect(response.data.contact.social_links).toEqual([
          { network: "instagram", url: "https://instagram.com/a" },
        ])
      })

      it("rejects a request with no publishable key", async () => {
        const response = await api.get("/store/storefront/settings").catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })
    })
  },
})
