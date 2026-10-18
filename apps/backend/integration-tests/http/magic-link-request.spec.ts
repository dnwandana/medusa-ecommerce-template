import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { magicLinkLocale } from "../../src/api/store/magic-link/route"
import { MAGIC_LINK_MODULE } from "../../src/modules/magic-link"
import type MagicLinkModuleService from "../../src/modules/magic-link/service"
import { runSeed } from "../../src/seed"
import { createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

const STOREFRONT_URL = (process.env.STOREFRONT_URL ?? "").replace(/\/$/, "")
const UA_CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"

describe("magicLinkLocale", () => {
  it("keeps id-ID and gives en-US for each other value", () => {
    expect(magicLinkLocale("id-ID")).toBe("id-ID")
    expect(magicLinkLocale(undefined)).toBe("en-US")
    expect(magicLinkLocale("en-US")).toBe("en-US")
    expect(magicLinkLocale("fr-FR")).toBe("en-US")
  })
})

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/magic-link", () => {
      let publishableKey: string
      let storeName: string

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        publishableKey = seed.publishableKey
        const [store] = await getContainer().resolve(Modules.STORE).listStores()
        storeName = store!.name
      })

      const post = (body: unknown, extra: Record<string, string> = {}) =>
        api
          .post("/store/magic-link", body, {
            headers: { "x-publishable-api-key": publishableKey, ...extra },
          })
          .catch((e: any) => e.response)

      const sentTo = async (email: string) =>
        getContainer()
          .resolve(Modules.NOTIFICATION)
          .listNotifications({ to: email, template: "magic-link" })

      it("sends the link with the name, the browser and the locale", async () => {
        await createCustomerWithToken(getContainer(), {
          email: "sari@example.com",
          first_name: "Sari",
        })
        const response = await post(
          { email: " Sari@Example.com " },
          { "x-medusa-locale": "id-ID", "user-agent": UA_CHROME_WINDOWS }
        )
        expect(response.status).toBe(200)
        expect(Object.keys(response.data).sort()).toEqual(["expires_at", "request_id", "secret"])
        const [email] = await sentTo("sari@example.com")
        expect(email!.data).toMatchObject({
          first_name: "Sari",
          browser: "Chrome on Windows",
          store_name: storeName,
        })
        expect(email!.data!.sign_in_url).toMatch(
          new RegExp(
            `^${STOREFRONT_URL}/id/account/sign-in/verify\\?id=${response.data.request_id}&token=[A-Za-z0-9_-]{43}$`
          )
        )
        expect(JSON.stringify(email!.data)).not.toContain(response.data.secret)
      })

      it("gives the same answer for an unknown email", async () => {
        const response = await post({ email: "nobody@example.com" })
        expect(response.status).toBe(200)
        expect(Object.keys(response.data).sort()).toEqual(["expires_at", "request_id", "secret"])
        const [email] = await sentTo("nobody@example.com")
        expect(email!.data!.first_name).toBeNull()
        expect(email!.data!.sign_in_url).toContain(`${STOREFRONT_URL}/account/sign-in/verify?`)
      })

      it("sends at most one link in 60 seconds", async () => {
        expect((await post({ email: "budi@example.com" })).status).toBe(200)
        const second = await post({ email: "budi@example.com" })
        expect(second.status).toBe(429)
        expect(second.data.message).toBe("Wait 60 seconds before you ask for a new link.")
        expect(await sentTo("budi@example.com")).toHaveLength(1)
      })

      it("sends one link when the requests for one email come at the same time", async () => {
        const answers = await Promise.all(
          Array.from({ length: 5 }, () => post({ email: "tari@example.com" }))
        )
        expect(answers.map((answer) => answer.status).sort()).toEqual([200, 429, 429, 429, 429])
        expect(await sentTo("tari@example.com")).toHaveLength(1)
        const magicLink: MagicLinkModuleService = getContainer().resolve(MAGIC_LINK_MODULE)
        expect(await magicLink.listMagicLinkRequests({ email: "tari@example.com" })).toHaveLength(1)
      })

      // Moves the requests of the email 61 seconds into the past, so the 60 second rule stops.
      const ageRequests = async (email: string) => {
        await getContainer()
          .resolve(ContainerRegistrationKeys.PG_CONNECTION)
          .raw(
            "UPDATE magic_link_request SET created_at = created_at - interval '61 seconds' WHERE email = ?",
            [email]
          )
      }

      const statusOf = async (answer: { data: { request_id: string; secret: string } }) =>
        (
          await api.post(
            "/store/magic-link/status",
            { id: answer.data.request_id, secret: answer.data.secret },
            { headers: { "x-publishable-api-key": publishableKey } }
          )
        ).data.status

      it("makes the older link invalid after the new link is sent", async () => {
        const first = await post({ email: "eka@example.com" })
        await ageRequests("eka@example.com")
        const second = await post({ email: "eka@example.com" })
        expect(second.status).toBe(200)
        expect(await statusOf(first)).toBe("expired")
        expect(await statusOf(second)).toBe("pending")
      })

      it("keeps the older link when the email of the new link fails", async () => {
        const first = await post({ email: "wati@example.com" })
        await ageRequests("wati@example.com")
        const notificationModule = getContainer().resolve(Modules.NOTIFICATION)
        const spy = jest
          .spyOn(notificationModule, "createNotifications")
          .mockRejectedValueOnce(new Error("The provider is down."))
        let second: any
        try {
          second = await post({ email: "wati@example.com" })
        } finally {
          spy.mockRestore()
        }
        expect(second.status).toBe(500)
        expect(await statusOf(first)).toBe("pending")

        const magicLink: MagicLinkModuleService = getContainer().resolve(MAGIC_LINK_MODULE)
        const rows = await magicLink.listMagicLinkRequests({ email: "wati@example.com" })
        const failed = rows.find((row) => row.id !== first.data.request_id)
        expect(failed!.invalidated_at).not.toBeNull()
        // The failed link does not start a new wait of 60 seconds.
        expect((await post({ email: "wati@example.com" })).status).toBe(200)
      })

      it("rejects a bad email and an unknown field", async () => {
        expect((await post({ email: "not-an-email" })).status).toBe(400)
        expect((await post({ email: "a@b.co", redirect: "/x" })).status).toBe(400)
      })
    })
  },
})
