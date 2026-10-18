import type { INotificationModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/magic-link/status and /session", () => {
      let storeHeaders: { headers: Record<string, string> }
      let notificationModule: INotificationModuleService

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        storeHeaders = { headers: { "x-publishable-api-key": seed.publishableKey } }
        notificationModule = getContainer().resolve(Modules.NOTIFICATION)
      })

      // Asks for a link and reads the token from the sent email.
      const requestLink = async (email: string) => {
        const { data } = await api.post("/store/magic-link", { email }, storeHeaders)
        const [sent] = await notificationModule.listNotifications({
          to: email,
          template: "magic-link",
        })
        const token = new URL(sent!.data!.sign_in_url as string).searchParams.get("token")!
        return { id: data.request_id as string, secret: data.secret as string, token }
      }

      const post = (path: string, body: unknown) =>
        api.post(`/store/magic-link/${path}`, body, storeHeaders).catch((e: any) => e.response)

      const bearer = (token: string) => ({
        headers: { ...storeHeaders.headers, authorization: `Bearer ${token}` },
      })

      it("gives a session to the original tab after a confirm on another device", async () => {
        const { id, secret, token } = await requestLink("sari@example.com")
        expect((await post("status", { id, secret })).data).toEqual({ status: "pending" })
        await post("confirm", { id, token })
        expect((await post("status", { id, secret })).data).toEqual({ status: "confirmed" })

        const session = await post("session", { id, secret })
        expect(session.status).toBe(200)
        const me = await api.get("/store/customers/me", bearer(session.data.token))
        expect(me.data.customer.email).toBe("sari@example.com")
        expect((await post("status", { id, secret })).data).toEqual({ status: "used" })
      })

      it("gives a session in the same browser with the token and the secret", async () => {
        const { id, secret, token } = await requestLink("budi@example.com")
        const session = await post("session", { id, secret, token })
        expect(session.status).toBe(200)
        const cookie = await api.post("/auth/session", {}, bearer(session.data.token))
        expect(cookie.status).toBe(200)
        expect(cookie.headers["set-cookie"]).toBeDefined()
      })

      it("gives no session without the secret, before a confirm, or a second time", async () => {
        const { id, secret, token } = await requestLink("rina@example.com")
        expect((await post("session", { id, secret: "wrong", token })).status).toBe(401)
        expect((await post("session", { id, secret })).status).toBe(401)
        expect((await post("session", { id, secret, token })).status).toBe(200)
        const again = await post("session", { id, secret, token })
        expect(again.status).toBe(401)
        expect(again.data.message).toBe("The link is not valid. Ask for a new link.")
      })

      it("gives one session when two calls for one link come at the same time", async () => {
        const { id, secret, token } = await requestLink("tari@example.com")
        const answers = await Promise.all([
          post("session", { id, secret, token }),
          post("session", { id, secret, token }),
          post("session", { id, secret, token }),
        ])
        expect(answers.map((answer) => answer.status).sort()).toEqual([200, 401, 401])
      })

      it("gives one session to the original tab when its calls come at the same time", async () => {
        const { id, secret, token } = await requestLink("eka@example.com")
        await post("confirm", { id, token })
        const answers = await Promise.all([
          post("session", { id, secret }),
          post("session", { id, secret }),
          post("session", { id, secret }),
        ])
        expect(answers.map((answer) => answer.status).sort()).toEqual([200, 401, 401])
      })

      it("refuses the customer emailpass routes", async () => {
        const body = { email: "wati@example.com", password: "secret-password" }
        const message = "The actor type customer is not allowed to use the auth provider emailpass"
        const register = await api
          .post("/auth/customer/emailpass/register", body, storeHeaders)
          .catch((e: any) => e.response)
        expect(register.status).toBe(400)
        expect(register.data.message).toBe(message)
        const login = await api
          .post("/auth/customer/emailpass", body, storeHeaders)
          .catch((e: any) => e.response)
        expect(login.status).toBe(400)
        expect(login.data.message).toBe(message)
      })

      it("answers invalid for a wrong secret and rejects a bad body", async () => {
        const { id } = await requestLink("dewi@example.com")
        expect((await post("status", { id, secret: "wrong" })).data).toEqual({ status: "invalid" })
        expect((await post("status", { id })).status).toBe(400)
        expect((await post("session", { id, secret: "x", email: "a@b.co" })).status).toBe(400)
      })
    })
  },
})
