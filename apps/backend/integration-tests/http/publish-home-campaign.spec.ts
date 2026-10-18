import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { STOREFRONT_MODULE } from "../../src/modules/storefront"
import StorefrontModuleService from "../../src/modules/storefront/service"
import { publishHomeCampaignWorkflow } from "../../src/workflows/publish-home-campaign"

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
    describe("publishHomeCampaignWorkflow", () => {
      const service = (): StorefrontModuleService => getContainer().resolve(STOREFRONT_MODULE)
      const run = (id: string) =>
        publishHomeCampaignWorkflow(getContainer()).run({ input: { id }, throwOnError: false })

      it("makes the campaign live and ends the old live campaign", async () => {
        const old = await service().createHomeCampaigns({ ...campaign, status: "live" })
        const next = await service().createHomeCampaigns(campaign)

        const { result, errors } = await run(next.id)

        expect(errors).toEqual([])
        expect(result.ended_id).toBe(old.id)
        expect(result.campaign).toMatchObject({ id: next.id, status: "live", ended_at: null })
        expect(result.campaign.went_live_at).toBeTruthy()
        const ended = await service().retrieveHomeCampaign(old.id)
        expect(ended.status).toBe("ended")
        expect(ended.ended_at).toBeTruthy()
      })

      it("keeps the old live campaign when the new id is unknown", async () => {
        const old = await service().createHomeCampaigns({ ...campaign, status: "live" })

        const { errors } = await run("hcmp_unknown")

        expect(errors).toHaveLength(1)
        expect((await service().retrieveHomeCampaign(old.id)).status).toBe("live")
      })

      it("publishes an ended campaign again and clears its end date", async () => {
        const ended = await service().createHomeCampaigns({
          ...campaign,
          status: "ended",
          ended_at: new Date("2026-09-01"),
        })
        const { result } = await run(ended.id)
        expect(result.campaign).toMatchObject({ status: "live", ended_at: null })
      })
    })
  },
})
