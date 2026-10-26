import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { BANK_ACCOUNT_MODULE } from "../../src/modules/bank-account"
import BankAccountModuleService from "../../src/modules/bank-account/service"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/bank-transfer", () => {
      it("returns only the accounts, the switch, and the deadline", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }

        const response = await api.get("/store/bank-transfer", { headers })

        expect(response.status).toBe(200)
        expect(Object.keys(response.data).sort()).toEqual([
          "bank_accounts",
          "deadline_hours",
          "enabled",
        ])
      })

      it("returns the active accounts in rank order with the public fields", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const service: BankAccountModuleService = getContainer().resolve(BANK_ACCOUNT_MODULE)
        await service.createBankAccounts([
          { bank_name: "Mandiri", account_number: "222", account_holder: "Toko", rank: 2 },
          { bank_name: "BCA", account_number: "111", account_holder: "Toko", rank: 1 },
          { bank_name: "BRI", account_number: "333", account_holder: "Toko", is_active: false },
        ])

        const response = await api.get("/store/bank-transfer", { headers })

        expect(response.status).toBe(200)
        const names = response.data.bank_accounts.map((a: any) => a.bank_name)
        expect(names).not.toContain("BRI")
        expect(names).toContain("BCA")
        expect(names.indexOf("BCA")).toBeLessThan(names.indexOf("Mandiri"))
        for (const account of response.data.bank_accounts) {
          expect(Object.keys(account).sort()).toEqual([
            "account_holder",
            "account_number",
            "bank_name",
            "id",
          ])
        }
      })

      it("returns the switch and the deadline hours with their defaults", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }

        const response = await api.get("/store/bank-transfer", { headers })

        expect(response.data.enabled).toBe(true)
        expect(response.data.deadline_hours).toBe(24)
      })

      it("reads the switch and the hours from the env at each request", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const keys = ["BANK_TRANSFER_ENABLED", "BANK_TRANSFER_DEADLINE_HOURS"] as const
        const previous = keys.map((key) => [key, process.env[key]] as const)
        process.env.BANK_TRANSFER_ENABLED = "false"
        process.env.BANK_TRANSFER_DEADLINE_HOURS = "48"
        try {
          const response = await api.get("/store/bank-transfer", { headers })
          expect(response.data.enabled).toBe(false)
          expect(response.data.deadline_hours).toBe(48)
        } finally {
          for (const [key, value] of previous) {
            if (value === undefined) delete process.env[key]
            else process.env[key] = value
          }
        }
      })

      it("rejects a request with no publishable key", async () => {
        const response = await api.get("/store/bank-transfer").catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })
    })
  },
})
