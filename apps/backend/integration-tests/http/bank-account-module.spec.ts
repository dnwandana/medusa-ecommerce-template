import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { BANK_ACCOUNT_MODULE } from "../../src/modules/bank-account"
import BankAccountModuleService from "../../src/modules/bank-account/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("bank account module storage", () => {
      let service: BankAccountModuleService

      beforeEach(() => {
        service = getContainer().resolve(BANK_ACCOUNT_MODULE)
      })

      it("stores bank accounts", async () => {
        await service.createBankAccounts({
          bank_name: "BCA",
          account_number: "123",
          account_holder: "Toko",
        })
        const [account] = await service.listBankAccounts({})
        expect(account).toMatchObject({ bank_name: "BCA", is_active: true, rank: 0 })
      })
    })
  },
})
