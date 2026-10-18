import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"
import { STOREFRONT_MODULE } from "../../src/modules/storefront"
import StorefrontModuleService from "../../src/modules/storefront/service"

jest.setTimeout(180 * 1000)

const campaign = {
  name: "Holiday 2026",
  image_url: "https://assets.example.com/holiday.jpg",
  title_en: "Gifts in *soft* linen",
  title_id: "Hadiah dari linen yang *lembut*",
  button_label_en: "Shop the gifts",
  button_label_id: "Belanja hadiah",
  link_type: "all_products" as const,
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/storefront/home-campaign", () => {
      let headers: Record<string, string>
      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        headers = { "x-publishable-api-key": seed.publishableKey }
      })
      const service = (): StorefrontModuleService => getContainer().resolve(STOREFRONT_MODULE)

      it("returns null when no campaign is live", async () => {
        await service().createHomeCampaigns(campaign)
        const response = await api.get("/store/storefront/home-campaign", { headers })
        expect(response.data).toEqual({ campaign: null })
      })

      it("returns the live campaign in the request locale", async () => {
        await service().createHomeCampaigns({ ...campaign, status: "live" })
        const response = await api.get("/store/storefront/home-campaign", {
          headers: { ...headers, "x-medusa-locale": "id-ID" },
        })
        expect(response.data.campaign).toMatchObject({
          title: "Hadiah dari linen yang *lembut*",
          button_label: "Belanja hadiah",
          link: "/products",
        })
        // The response has no staff field.
        expect(Object.keys(response.data.campaign).sort()).toEqual([
          "button_label",
          "eyebrow",
          "id",
          "image_url",
          "link",
          "mobile_image_url",
          "text",
          "title",
        ])
      })

      // Review Focus: a live campaign links to a category that staff later deleted.
      it("links to /products after staff delete the category", async () => {
        const products = getContainer().resolve(Modules.PRODUCT)
        const category = await products.createProductCategories({
          name: "Gifts",
          handle: "gifts",
          is_active: true,
        })
        await service().createHomeCampaigns({
          ...campaign,
          status: "live",
          link_type: "category",
          link_category_id: category.id,
        })
        const before = await api.get("/store/storefront/home-campaign", { headers })
        expect(before.data.campaign.link).toBe("/categories/gifts")

        await products.deleteProductCategories([category.id])
        const after = await api.get("/store/storefront/home-campaign", { headers })
        expect(after.data.campaign.link).toBe("/products")
      })

      it("links to /products for an internal category", async () => {
        const products = getContainer().resolve(Modules.PRODUCT)
        const category = await products.createProductCategories({
          name: "Staff only",
          handle: "staff-only",
          is_active: true,
          is_internal: true,
        })
        await service().createHomeCampaigns({
          ...campaign,
          status: "live",
          link_type: "category",
          link_category_id: category.id,
        })
        const response = await api.get("/store/storefront/home-campaign", { headers })
        expect(response.data.campaign.link).toBe("/products")
      })
    })
  },
})
