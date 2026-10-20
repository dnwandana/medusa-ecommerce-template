import type { MedusaContainer } from "@medusajs/framework/types"
import { BANK_ACCOUNT_MODULE } from "../modules/bank-account"
import type BankAccountModuleService from "../modules/bank-account/service"

// Returns the address for the owner emails. The store contact wins because the owner edits it in
// the admin. The env value is the fallback for a store with no contact. An empty string means
// that no address exists, and the caller skips the email.
export async function readOwnerEmail(
  scope: MedusaContainer,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const bankAccount: BankAccountModuleService = scope.resolve(BANK_ACCOUNT_MODULE)
  const contact = await bankAccount.getContact()
  return contact.email?.trim() || env.STORE_OWNER_EMAIL?.trim() || ""
}
