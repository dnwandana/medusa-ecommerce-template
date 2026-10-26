import { moveAccount, validateBankAccountForm } from "../bank-transfer-form"

describe("validateBankAccountForm", () => {
  it("returns no errors for a complete form", () => {
    expect(
      validateBankAccountForm({
        bank_name: "BCA",
        account_number: "0123456789",
        account_holder: "Toko",
      })
    ).toEqual({})
  })

  it("names each empty field and an account number with letters", () => {
    expect(
      validateBankAccountForm({ bank_name: " ", account_number: "12ab", account_holder: "" })
    ).toEqual({
      bank_name: "Enter the bank name.",
      account_number: "Enter 5 to 20 digits.",
      account_holder: "Enter the account holder.",
    })
  })
})

describe("moveAccount", () => {
  const list = [
    { id: "a", rank: 0 },
    { id: "b", rank: 1 },
    { id: "c", rank: 2 },
  ]

  it("swaps the account with the one above it", () => {
    expect(moveAccount(list, "b", "up")).toEqual([
      { id: "b", rank: 0 },
      { id: "a", rank: 1 },
    ])
  })

  it("swaps the account with the one below it", () => {
    expect(moveAccount(list, "b", "down")).toEqual([
      { id: "c", rank: 1 },
      { id: "b", rank: 2 },
    ])
  })

  it("changes nothing for the first account and up", () => {
    expect(moveAccount(list, "a", "up")).toEqual([])
  })

  it("changes nothing for the last account and down", () => {
    expect(moveAccount(list, "c", "down")).toEqual([])
  })

  it("changes nothing for an unknown id", () => {
    expect(moveAccount(list, "x", "up")).toEqual([])
  })

  it("gives each account its own rank when two accounts have the same rank", () => {
    const tied = [
      { id: "a", rank: 0 },
      { id: "b", rank: 0 },
    ]
    expect(moveAccount(tied, "b", "up")).toEqual([
      { id: "b", rank: 0 },
      { id: "a", rank: 1 },
    ])
  })

  it("also returns the other accounts whose rank changes", () => {
    const tied = [
      { id: "a", rank: 0 },
      { id: "b", rank: 0 },
      { id: "c", rank: 0 },
    ]
    expect(moveAccount(tied, "b", "up")).toEqual([
      { id: "b", rank: 0 },
      { id: "a", rank: 1 },
      { id: "c", rank: 2 },
    ])
  })
})
