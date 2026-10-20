import { BANK_ACCOUNT_MODULE } from "../../modules/bank-account"
import { listActiveBankAccounts } from "../bank-accounts"

describe("listActiveBankAccounts", () => {
  it("lists the active accounts in order and returns only the public fields", async () => {
    const listBankAccounts = jest.fn().mockResolvedValue([
      {
        id: "ba_1",
        bank_name: "BCA",
        account_number: "0123456789",
        account_holder: "Toko",
        is_active: true,
        rank: 0,
      },
    ])
    const container = {
      resolve: (key: string) => (key === BANK_ACCOUNT_MODULE ? { listBankAccounts } : undefined),
    } as any

    const accounts = await listActiveBankAccounts(container)

    expect(listBankAccounts).toHaveBeenCalledWith(
      { is_active: true },
      { order: { rank: "ASC", created_at: "ASC" } }
    )
    expect(accounts).toEqual([
      { bank_name: "BCA", account_number: "0123456789", account_holder: "Toko" },
    ])
  })
})
