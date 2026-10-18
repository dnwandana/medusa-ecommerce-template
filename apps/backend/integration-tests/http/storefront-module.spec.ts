import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
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
  testSuite: ({ getContainer }) => {
    describe("storefront module storage", () => {
      it("keeps one settings row and returns the saved values", async () => {
        const service: StorefrontModuleService = getContainer().resolve(STOREFRONT_MODULE)
        expect(await service.getSettings()).toEqual({
          new_badge_days: 30,
          low_stock_threshold: 5,
          price_limits: [],
        })

        await service.saveSettings({
          new_badge_days: 14,
          low_stock_threshold: 3,
          price_limits: [500000],
        })
        await service.saveSettings({ new_badge_days: 7, low_stock_threshold: 0, price_limits: [] })
        expect(await service.listStorefrontSettings({})).toHaveLength(1)
        expect(await service.getSettings()).toEqual({
          new_badge_days: 7,
          low_stock_threshold: 0,
          price_limits: [],
        })
      })

      it("stores a colour with a lower-case hex", async () => {
        const service: StorefrontModuleService = getContainer().resolve(STOREFRONT_MODULE)
        await service.createColour({ name: "Sage", hex: "#9AA68C" })
        expect(await service.listColours()).toEqual([
          { id: expect.any(String), name: "Sage", hex: "#9aa68c" },
        ])
      })

      it("creates a draft and allows only one live campaign", async () => {
        const service: StorefrontModuleService = getContainer().resolve(STOREFRONT_MODULE)
        const draft = await service.createHomeCampaigns(campaign)
        expect(draft.status).toBe("draft")

        await service.createHomeCampaigns({ ...campaign, status: "live" })
        await expect(service.createHomeCampaigns({ ...campaign, status: "live" })).rejects.toThrow()
        expect((await service.getLiveCampaign())?.status).toBe("live")
      })
    })
  },
})
