import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../modules/bank-account"
import type BankAccountModuleService from "../modules/bank-account/service"
import type { EmailStore } from "../email/templates/shell"

const DEFAULT_STORE_NAME = "our store"

// Returns the store details for the email footer. An email must still send when the store row
// does not exist, so a missing name falls back to a default and never throws.
export async function readStoreForEmail(scope: MedusaContainer): Promise<EmailStore> {
  const bankAccount: BankAccountModuleService = scope.resolve(BANK_ACCOUNT_MODULE)
  const [[store], contact] = await Promise.all([
    scope.resolve(Modules.STORE).listStores({}, { take: 1 }),
    bankAccount.getContact(),
  ])
  return {
    name: store?.name || DEFAULT_STORE_NAME,
    contact_email: contact.email,
    whatsapp: contact.whatsapp,
  }
}
