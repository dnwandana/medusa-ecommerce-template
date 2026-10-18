import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

const body = {
  name: "Holiday 2026",
  image_url: "https://assets.example.com/holiday.jpg",
  title_en: "Gifts in *soft* linen",
  title_id: "Hadiah dari linen yang *lembut*",
  button_label_en: "Shop the gifts",
  button_label_id: "Belanja hadiah",
  eyebrow_en: "  ",
  link_type: "all_products",
  link_path: "/about",
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("home campaign actions", () => {
      const create = async (headers: object, extra = {}) =>
        (await api.post("/admin/home-campaigns", { ...body, ...extra }, { headers })).data
          .home_campaign

      it("publishes, unpublishes and duplicates", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const first = await create(headers)
        const second = await create(headers, { name: "Rainy season" })

        await api.post(`/admin/home-campaigns/${first.id}/publish`, {}, { headers })
        const published = await api.post(
          `/admin/home-campaigns/${second.id}/publish`,
          {},
          { headers }
        )
        expect(published.data.ended_id).toBe(first.id)
        expect(published.data.home_campaign.status).toBe("live")

        const unpublished = await api.post(
          `/admin/home-campaigns/${second.id}/unpublish`,
          {},
          { headers }
        )
        expect(unpublished.data.home_campaign.status).toBe("ended")

        const copy = await api.post(`/admin/home-campaigns/${second.id}/duplicate`, {}, { headers })
        expect(copy.data.home_campaign).toMatchObject({
          name: "Rainy season (copy)",
          status: "draft",
        })
      })

      it("returns no ended id when no campaign was live", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const campaign = await create(headers)
        const published = await api.post(
          `/admin/home-campaigns/${campaign.id}/publish`,
          {},
          { headers }
        )
        expect(published.data.ended_id).toBeNull()
      })

      it("refuses to publish a campaign whose category no longer exists", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const campaign = await create(headers, {
          link_type: "category",
          link_category_id: "pcat_gone",
        })
        const response = await api
          .post(`/admin/home-campaigns/${campaign.id}/publish`, {}, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
        expect(response.data.message).toBe(
          "The link category no longer exists. Select another category, then publish."
        )
      })

      it("returns 404 when the campaign does not exist", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/home-campaigns/hcmp_unknown/publish", {}, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(404)
      })

      it("refuses to unpublish a draft", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const draft = await create(headers)
        const response = await api
          .post(`/admin/home-campaigns/${draft.id}/unpublish`, {}, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })
    })
  },
})
