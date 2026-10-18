import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { MAGIC_LINK_MODULE } from "../../src/modules/magic-link"
import MagicLinkModuleService from "../../src/modules/magic-link/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("magic link module registration", () => {
      it("stores a request in the magic link table", async () => {
        const service: MagicLinkModuleService = getContainer().resolve(MAGIC_LINK_MODULE)
        const created = await service.createMagicLinkRequests({
          email: "sari@example.com",
          token_hash: "a".repeat(64),
          secret_hash: "b".repeat(64),
          locale: "en-US",
          browser: "Chrome on Windows",
          expires_at: new Date(Date.now() + 15 * 60 * 1000),
        })
        expect(created.id).toMatch(/^mlr_/)
        expect(await service.listMagicLinkRequests({ email: "sari@example.com" })).toHaveLength(1)
      })

      it("closes the customer emailpass routes and keeps the admin route", async () => {
        const body = { email: "sari@example.com", password: "a-password" }
        const customer = await api
          .post("/auth/customer/emailpass", body)
          .catch((e: any) => e.response)
        expect(customer.status).toBe(400)
        expect(customer.data.message).toBe(
          "The actor type customer is not allowed to use the auth provider emailpass"
        )

        const register = await api
          .post("/auth/customer/emailpass/register", body)
          .catch((e: any) => e.response)
        expect(register.status).toBe(400)

        // No user has this email. A 401 answer shows that the route is open.
        const admin = await api.post("/auth/user/emailpass", body).catch((e: any) => e.response)
        expect(admin.status).toBe(401)
      })
    })
  },
})
