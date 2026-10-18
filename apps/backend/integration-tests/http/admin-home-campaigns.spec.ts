import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { STOREFRONT_MODULE } from "../../src/modules/storefront"
import StorefrontModuleService from "../../src/modules/storefront/service"
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
    describe("/admin/home-campaigns", () => {
      it("creates a draft and clears the unused link field", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const created = await api.post("/admin/home-campaigns", body, { headers })
        expect(created.data.home_campaign).toMatchObject({
          name: "Holiday 2026",
          status: "draft",
          link_path: null,
          eyebrow_en: null,
        })
      })

      it("rejects a path link that is not a store path", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post(
            "/admin/home-campaigns",
            { ...body, link_type: "path", link_path: "https://evil.example.com" },
            { headers }
          )
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("takes an http or https image URL and names both in the error", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const http = await api.post(
          "/admin/home-campaigns",
          { ...body, image_url: "http://assets.example.com/holiday.jpg" },
          { headers }
        )
        expect(http.status).toBe(200)
        const message = "Enter an image URL that starts with http:// or https://."
        for (const field of ["image_url", "mobile_image_url"]) {
          const response = await api
            .post("/admin/home-campaigns", { ...body, [field]: "javascript:alert(1)" }, { headers })
            .catch((e: any) => e.response)
          expect(response.status).toBe(400)
          expect(response.data.message).toContain(message)
        }
      })

      it("rejects a category link with no category", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/home-campaigns", { ...body, link_type: "category" }, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("rejects a status in the body", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/home-campaigns", { ...body, status: "live" }, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("lists by status and by a part of the name", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        await api.post("/admin/home-campaigns", body, { headers })
        await api.post("/admin/home-campaigns", { ...body, name: "Rainy season" }, { headers })

        const list = await api.get("/admin/home-campaigns?status=draft&q=rainy", { headers })
        expect(list.data.count).toBe(1)
        expect(list.data.home_campaigns[0].name).toBe("Rainy season")
      })

      it("treats % and _ in q as plain characters", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        await api.post("/admin/home-campaigns", body, { headers })

        const list = await api.get("/admin/home-campaigns?q=%25", { headers })
        expect(list.data.count).toBe(0)
      })
    })

    describe("/admin/home-campaigns/:id", () => {
      it("reads and edits one campaign", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const { id } = (await api.post("/admin/home-campaigns", body, { headers })).data
          .home_campaign

        const edited = await api.post(
          `/admin/home-campaigns/${id}`,
          { ...body, title_en: "New title" },
          { headers }
        )
        expect(edited.data.home_campaign).toMatchObject({
          id,
          title_en: "New title",
          status: "draft",
        })
        expect(
          (await api.get(`/admin/home-campaigns/${id}`, { headers })).data.home_campaign.title_en
        ).toBe("New title")
      })

      it("keeps the status and the dates of a live campaign", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const service: StorefrontModuleService = getContainer().resolve(STOREFRONT_MODULE)
        const wentLiveAt = new Date("2026-10-01T00:00:00.000Z")
        const live = await service.createHomeCampaigns({
          ...body,
          link_type: "all_products",
          link_path: null,
          status: "live",
          went_live_at: wentLiveAt,
        })

        const edited = await api.post(
          `/admin/home-campaigns/${live.id}`,
          { ...body, title_en: "New title" },
          { headers }
        )
        expect(edited.data.home_campaign).toMatchObject({ status: "live", title_en: "New title" })
        expect(new Date(edited.data.home_campaign.went_live_at)).toEqual(wentLiveAt)
      })

      it("deletes a draft and then returns 404 for it", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const { id } = (await api.post("/admin/home-campaigns", body, { headers })).data
          .home_campaign

        const deleted = await api.delete(`/admin/home-campaigns/${id}`, { headers })
        expect(deleted.data).toEqual({ id, object: "home_campaign", deleted: true })
        const response = await api
          .get(`/admin/home-campaigns/${id}`, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(404)

        // The delete is a soft delete, so the row stays with deleted_at.
        const service: StorefrontModuleService = getContainer().resolve(STOREFRONT_MODULE)
        const [row] = await service.listHomeCampaigns({ id }, { withDeleted: true })
        expect(row.deleted_at).toBeTruthy()
      })

      it("returns 404 for an unknown id", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/home-campaigns/hcmp_unknown", body, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(404)
      })

      it("refuses to delete a live campaign", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const service: StorefrontModuleService = getContainer().resolve(STOREFRONT_MODULE)
        const live = await service.createHomeCampaigns({
          ...body,
          link_type: "all_products",
          link_path: null,
          status: "live",
        })
        const response = await api
          .delete(`/admin/home-campaigns/${live.id}`, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })
    })
  },
})
