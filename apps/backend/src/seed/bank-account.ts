import type { MedusaContainer } from "@medusajs/framework/types"
import { BANK_ACCOUNT_MODULE } from "../modules/bank-account"
import type BankAccountModuleService from "../modules/bank-account/service"

// "Sample" marks demo data. The owner must replace it in Medusa Admin before the store opens.
const SAMPLE_ACCOUNT = {
  bank_name: "Sample Bank",
  account_number: "1234567890",
  account_holder: "Sample Store",
}
const SAMPLE_CONTACT = { email: "store@example.com", whatsapp: "+6281234567890" }

// Adds the sample bank account and the sample contact. It adds each one only when the owner has
// no data for it, so a second run does not add a second account or overwrite the owner contact.
export async function seedBankAccount(container: MedusaContainer): Promise<void> {
  const service: BankAccountModuleService = container.resolve(BANK_ACCOUNT_MODULE)

  const existing = await service.listBankAccounts({}, { take: 1 })
  if (existing.length === 0) {
    await service.createBankAccounts(SAMPLE_ACCOUNT)
  }

  const contact = await service.getContact()
  if (contact.email === null && contact.whatsapp === null) {
    await service.setContact(SAMPLE_CONTACT)
  }
}
