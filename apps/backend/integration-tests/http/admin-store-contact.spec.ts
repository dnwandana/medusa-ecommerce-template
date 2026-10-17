import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("/admin/store-contact", () => {
      it("returns empty values first and then the saved contact", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        expect((await api.get("/admin/store-contact", { headers })).data.contact).toEqual({
          email: null,
          whatsapp: null,
        })

        const saved = await api.post(
          "/admin/store-contact",
          { email: "store@example.com", whatsapp: "+6281234567890" },
          { headers }
        )
        expect(saved.data.contact).toEqual({
          email: "store@example.com",
          whatsapp: "+6281234567890",
        })
        expect((await api.get("/admin/store-contact", { headers })).data.contact).toEqual(
          saved.data.contact
        )
      })

      it("clears a value with null", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        await api.post(
          "/admin/store-contact",
          { email: "store@example.com", whatsapp: "+6281234567890" },
          { headers }
        )

        const saved = await api.post(
          "/admin/store-contact",
          { email: "store@example.com", whatsapp: null },
          { headers }
        )
        expect(saved.data.contact).toEqual({ email: "store@example.com", whatsapp: null })
      })

      it("rejects a WhatsApp number that is not in the E.164 format", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/store-contact", { email: null, whatsapp: "081234567890" }, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("rejects an empty string", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/store-contact", { email: "", whatsapp: null }, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("rejects a request with no admin login", async () => {
        const response = await api.get("/admin/store-contact").catch((e: any) => e.response)
        expect(response.status).toBe(401)
      })
    })
  },
})
