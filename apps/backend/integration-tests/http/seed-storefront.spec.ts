import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { EMPTY_CONTACT } from "../../src/lib/store-contact"
import { runSeed } from "../../src/seed"
import { STOREFRONT_MODULE } from "../../src/modules/storefront"
import type StorefrontModuleService from "../../src/modules/storefront/service"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    const service = () => getContainer().resolve<StorefrontModuleService>(STOREFRONT_MODULE)

    describe("seedStorefront", () => {
      it("seeds three colours and two price limits", async () => {
        await runSeed(getContainer())

        const colours = await service().listColours()
        expect(colours.map(({ name, hex }) => ({ name, hex }))).toEqual([
          { name: "Black", hex: "#1d1b18" },
          { name: "Sage", hex: "#9aa68c" },
          { name: "White", hex: "#f4f1eb" },
        ])
        expect(await service().getSettings()).toEqual({
          new_badge_days: 30,
          low_stock_threshold: 5,
          price_limits: [200000, 500000],
        })
      })

      it("keeps the values that staff changed when it runs again", async () => {
        await runSeed(getContainer())
        await service().saveSettings({
          new_badge_days: 14,
          low_stock_threshold: 3,
          price_limits: [],
        })
        await runSeed(getContainer())

        expect(await service().getSettings()).toEqual({
          new_badge_days: 14,
          low_stock_threshold: 3,
          price_limits: [],
        })
        expect(await service().listColours()).toHaveLength(3)
      })

      it("does not add a colour that staff added in another case", async () => {
        await service().createColour({ name: " black ", hex: "#000000" })
        await runSeed(getContainer())

        const names = (await service().listColours()).map(({ name }) => name)
        expect(names.sort()).toEqual(["Sage", "White", "black"])
      })

      it("adds the sample contact", async () => {
        await runSeed(getContainer())

        expect(await service().getContact()).toEqual({
          email: "store@example.com",
          phone: null,
          whatsapp: "+6281234567890",
          address: null,
          social_links: [],
        })
      })

      it("keeps the owner contact on a second run", async () => {
        await runSeed(getContainer())
        await service().setContact({ ...EMPTY_CONTACT, email: "owner@shop.id" })

        await runSeed(getContainer())

        expect(await service().listStorefrontContacts({})).toHaveLength(1)
        expect(await service().getContact()).toEqual({ ...EMPTY_CONTACT, email: "owner@shop.id" })
      })
    })
  },
})
