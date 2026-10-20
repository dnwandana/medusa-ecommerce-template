import type { MedusaContainer } from "@medusajs/framework/types"
import { BANK_ACCOUNT_MODULE } from "../modules/bank-account"
import type BankAccountModuleService from "../modules/bank-account/service"
import type { OrderPlacedBankAccount } from "../email/templates/order-placed"

// Returns the active bank accounts in display order. An email shows only the public fields.
export async function listActiveBankAccounts(
  scope: MedusaContainer
): Promise<OrderPlacedBankAccount[]> {
  const service: BankAccountModuleService = scope.resolve(BANK_ACCOUNT_MODULE)
  const accounts = await service.listBankAccounts(
    { is_active: true },
    { order: { rank: "ASC", created_at: "ASC" } }
  )
  return accounts.map((account) => ({
    bank_name: account.bank_name,
    account_number: account.account_number,
    account_holder: account.account_holder,
  }))
}
