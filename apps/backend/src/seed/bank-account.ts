import type { MedusaContainer } from "@medusajs/framework/types"
import { BANK_ACCOUNT_MODULE } from "../modules/bank-account"
import type BankAccountModuleService from "../modules/bank-account/service"

// "Sample" marks demo data. The owner must replace it in Medusa Admin before the store opens.
const SAMPLE_ACCOUNT = {
  bank_name: "Sample Bank",
  account_number: "1234567890",
  account_holder: "Sample Store",
}

// Adds the sample bank account. It adds the account only when the owner has no account, so a
// second run does not add a second account.
export async function seedBankAccount(container: MedusaContainer): Promise<void> {
  const service: BankAccountModuleService = container.resolve(BANK_ACCOUNT_MODULE)

  const existing = await service.listBankAccounts({}, { take: 1 })
  if (existing.length === 0) {
    await service.createBankAccounts(SAMPLE_ACCOUNT)
  }
}
