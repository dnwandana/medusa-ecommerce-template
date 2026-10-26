import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

const EMPTY = { email: null, phone: null, whatsapp: null, address: null, social_links: [] }

// The WhatsApp number has a country code other than +62, because the route accepts any country.
// A network appears two times, because the owner can link to two accounts of one network.
const FULL = {
  email: "store@example.com",
  phone: "+622155500100",
  whatsapp: "+60123456789",
  address: "Jl. Sudirman 1\nJakarta 10220",
  social_links: [
    { network: "instagram", url: "https://instagram.com/store" },
    { network: "instagram", url: "https://instagram.com/store.outlet" },
  ],
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("/admin/store-contact", () => {
      it("returns the empty contact first and then the saved contact", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        expect((await api.get("/admin/store-contact", { headers })).data.contact).toEqual(EMPTY)

        const saved = await api.post("/admin/store-contact", FULL, { headers })
        expect(saved.data.contact).toEqual(FULL)
        expect((await api.get("/admin/store-contact", { headers })).data.contact).toEqual(FULL)
      })

      it("clears a value with null", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        await api.post("/admin/store-contact", FULL, { headers })

        const saved = await api.post("/admin/store-contact", { ...FULL, phone: null }, { headers })
        expect(saved.data.contact).toEqual({ ...FULL, phone: null })
      })

      it.each([
        ["a local WhatsApp number", { whatsapp: "081234567890" }],
        ["a local phone number", { phone: "0215550100" }],
        ["an empty string", { email: "" }],
        ["an address of 501 characters", { address: "a".repeat(501) }],
        ["11 links", { social_links: Array(11).fill({ network: "x", url: "https://x.com/a" }) }],
        [
          "an unknown network",
          { social_links: [{ network: "myspace", url: "https://myspace.com/a" }] },
        ],
        ["an http link", { social_links: [{ network: "x", url: "http://x.com/a" }] }],
        [
          "a link to another host",
          { social_links: [{ network: "instagram", url: "https://tiktok.com/@a" }] },
        ],
        // JSON drops a key with the value undefined, so the body has no address.
        ["a missing field", { address: undefined }],
      ])("rejects %s with 400", async (_name, change) => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/store-contact", { ...FULL, ...change }, { headers })
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
