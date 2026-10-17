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

      it("adds one sample account and the sample contact", async () => {
        await runSeed(getContainer())

        expect(await service.listBankAccounts({})).toEqual([
          expect.objectContaining({
            bank_name: "Sample Bank",
            account_number: "1234567890",
            account_holder: "Sample Store",
            is_active: true,
          }),
        ])
        expect(await service.getContact()).toEqual({
          email: "store@example.com",
          whatsapp: "+6281234567890",
        })
      })

      it("adds no second account and keeps the owner contact on a second run", async () => {
        await runSeed(getContainer())
        await service.setContact({ email: "owner@shop.id", whatsapp: null })

        await runSeed(getContainer())

        expect(await service.listBankAccounts({})).toHaveLength(1)
        expect(await service.listStoreContacts({})).toHaveLength(1)
        expect(await service.getContact()).toEqual({ email: "owner@shop.id", whatsapp: null })
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
