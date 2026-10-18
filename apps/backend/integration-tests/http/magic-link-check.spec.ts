import type { INotificationModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/magic-link/verify and /confirm", () => {
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

      it("verifies an open link and does not use it up", async () => {
        const { id, token } = await requestLink("sari@example.com")
        const first = await post("verify", { id, token })
        expect(first.status).toBe(200)
        expect(first.data).toEqual({
          browser: expect.any(String),
          requested_at: expect.any(String),
        })
        expect((await post("verify", { id, token })).status).toBe(200)
      })

      it("confirms an open link one time", async () => {
        const { id, token } = await requestLink("budi@example.com")
        const first = await post("confirm", { id, token })
        expect(first.status).toBe(200)
        expect(first.data).toEqual({ confirmed: true })
        const second = await post("confirm", { id, token })
        expect(second.status).toBe(400)
        expect(second.data.message).toBe("The link is not valid. Ask for a new link.")
        expect((await post("verify", { id, token })).status).toBe(400)
      })

      it("confirms a link one time when two calls come at the same time", async () => {
        const { id, token } = await requestLink("tari@example.com")
        const answers = await Promise.all([
          post("confirm", { id, token }),
          post("confirm", { id, token }),
          post("confirm", { id, token }),
        ])
        expect(answers.map((answer) => answer.status).sort()).toEqual([200, 400, 400])
      })

      it("rejects a wrong token, an unknown id and a bad body", async () => {
        const { id } = await requestLink("rina@example.com")
        expect((await post("verify", { id, token: "wrong" })).status).toBe(400)
        expect((await post("verify", { id: "mlr_unknown", token: "x" })).status).toBe(400)
        expect((await post("confirm", { id })).status).toBe(400)
        expect((await post("confirm", { id, token: "x", secret: "y" })).status).toBe(400)
      })
    })
  },
})
