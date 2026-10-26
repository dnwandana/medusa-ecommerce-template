import BankAccountModuleService from "../service"

const proto = BankAccountModuleService.prototype as any

describe("bank account service", () => {
  it("has the generated methods for bank accounts", () => {
    for (const name of [
      "createBankAccounts",
      "listBankAccounts",
      "updateBankAccounts",
      "deleteBankAccounts",
    ]) {
      expect(typeof proto[name]).toBe("function")
    }
  })

  it("has no store contact methods", () => {
    for (const name of ["getContact", "setContact", "listStoreContacts", "createStoreContacts"]) {
      expect(proto[name]).toBeUndefined()
    }
  })
})
