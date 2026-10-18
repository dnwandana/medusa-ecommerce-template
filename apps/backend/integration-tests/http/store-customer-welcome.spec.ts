import type { ICustomerModuleService, INotificationModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"
import { type Actor, createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

const STOREFRONT_URL = (process.env.STOREFRONT_URL ?? "").replace(/\/+$/, "")

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/customers/me/welcome", () => {
      let storeHeaders: Record<string, string>
      let storeName: string
      let customerModule: ICustomerModuleService
      let notificationModule: INotificationModuleService

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        storeHeaders = { "x-publishable-api-key": seed.publishableKey }
        const [store] = await getContainer().resolve(Modules.STORE).listStores()
        storeName = store!.name
        customerModule = getContainer().resolve(Modules.CUSTOMER)
        notificationModule = getContainer().resolve(Modules.NOTIFICATION)
      })

      const post = (actor: Actor, body: unknown) =>
        api
          .post("/store/customers/me/welcome", body, {
            headers: { ...storeHeaders, ...actor.headers },
          })
          .catch((e: any) => e.response)

      const welcomes = (email: string) =>
        notificationModule.listNotifications({ to: email, template: "welcome" })

      it("saves the name, marks the customer and sends one email", async () => {
        const actor = await createCustomerWithToken(getContainer(), {
          email: "sari@example.com",
          first_name: null,
          last_name: null,
        })
        const response = await post(actor, { first_name: "Sari", last_name: "Wulandari" })
        expect(response.data).toEqual({ sent: true })
        const customer = await customerModule.retrieveCustomer(actor.id)
        expect(customer).toMatchObject({ first_name: "Sari", last_name: "Wulandari" })
        expect(new Date(customer.metadata!.welcome_sent_at as string).toString()).not.toBe(
          "Invalid Date"
        )
        const [email] = await welcomes("sari@example.com")
        expect(email!.data).toEqual({
          store_name: storeName,
          first_name: "Sari",
          shop_url: STOREFRONT_URL,
        })
      })

      it("sends no second email and keeps the first name", async () => {
        const actor = await createCustomerWithToken(getContainer(), {
          email: "budi@example.com",
          first_name: null,
        })
        await post(actor, { first_name: "Budi" })
        expect((await post(actor, { first_name: "Other" })).data).toEqual({ sent: false })
        expect((await customerModule.retrieveCustomer(actor.id)).first_name).toBe("Budi")
        expect(await welcomes("budi@example.com")).toHaveLength(1)
      })

      it("sends one email for two calls at the same time", async () => {
        const actor = await createCustomerWithToken(getContainer(), {
          email: "dua@example.com",
          first_name: null,
        })
        const results = await Promise.all([post(actor, {}), post(actor, {})])
        expect(results.map((r) => r.data.sent).sort()).toEqual([false, true])
        expect(await welcomes("dua@example.com")).toHaveLength(1)
      })

      it("keeps the name and the other metadata on Skip", async () => {
        const actor = await createCustomerWithToken(getContainer(), {
          email: "skip@example.com",
          first_name: null,
          last_name: null,
        })
        await customerModule.updateCustomers(actor.id, { metadata: { source: "test" } })
        await post(actor, {})
        const customer = await customerModule.retrieveCustomer(actor.id)
        expect(customer.first_name).toBeNull()
        expect(customer.metadata).toMatchObject({ source: "test" })
        expect((await welcomes("skip@example.com"))[0]!.data!.first_name).toBeNull()
      })

      it("needs a signed-in customer and a valid body", async () => {
        const response = await api
          .post("/store/customers/me/welcome", {}, { headers: storeHeaders })
          .catch((e: any) => e.response)
        expect(response.status).toBe(401)
        const actor = await createCustomerWithToken(getContainer())
        expect((await post(actor, { email: "x@y.co" })).status).toBe(400)
      })
    })
  },
})
