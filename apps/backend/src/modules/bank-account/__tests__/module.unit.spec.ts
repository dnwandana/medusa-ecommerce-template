import BankAccountModule, { BANK_ACCOUNT_MODULE } from ".."

describe("bank account module", () => {
  it("has the module name bankAccount", () => {
    expect(BANK_ACCOUNT_MODULE).toBe("bankAccount")
  })

  it("exposes the bank account and the store contact as linkables", () => {
    expect(BankAccountModule.linkable.bankAccount).toBeDefined()
    expect(BankAccountModule.linkable.storeContact).toBeDefined()
  })
})
