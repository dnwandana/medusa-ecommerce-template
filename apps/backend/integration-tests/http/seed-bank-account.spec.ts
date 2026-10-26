import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { BANK_ACCOUNT_MODULE } from "../../src/modules/bank-account"
import BankAccountModuleService from "../../src/modules/bank-account/service"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("seedBankAccount", () => {
      let service: BankAccountModuleService

      beforeEach(() => {
        service = getContainer().resolve(BANK_ACCOUNT_MODULE)
      })

      it("adds one sample account", async () => {
        await runSeed(getContainer())

        expect(await service.listBankAccounts({})).toEqual([
          expect.objectContaining({
            bank_name: "Sample Bank",
            account_number: "1234567890",
            account_holder: "Sample Store",
            is_active: true,
          }),
        ])
      })

      it("adds no second account on a second run", async () => {
        await runSeed(getContainer())

        await runSeed(getContainer())

        expect(await service.listBankAccounts({})).toHaveLength(1)
      })

      it("adds no sample account when the owner already has an account", async () => {
        await service.createBankAccounts({
          bank_name: "BCA",
          account_number: "5550001",
          account_holder: "Toko",
        })

        await runSeed(getContainer())

        expect((await service.listBankAccounts({})).map((a) => a.bank_name)).toEqual(["BCA"])
      })
    })
  },
})
