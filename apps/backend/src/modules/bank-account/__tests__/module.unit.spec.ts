import BankAccountModule, { BANK_ACCOUNT_MODULE } from ".."

describe("bank account module", () => {
  it("has the module name bankAccount", () => {
    expect(BANK_ACCOUNT_MODULE).toBe("bankAccount")
  })

  it("exposes the bank account as a linkable, and no store contact", () => {
    expect(BankAccountModule.linkable.bankAccount).toBeDefined()
    expect((BankAccountModule.linkable as Record<string, unknown>).storeContact).toBeUndefined()
  })
})
