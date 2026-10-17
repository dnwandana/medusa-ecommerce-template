import { MedusaService } from "@medusajs/framework/utils"
import BankAccount from "./models/bank-account"
import StoreContact from "./models/store-contact"

export type StoreContactValues = { email: string | null; whatsapp: string | null }

// Reads the oldest row, so that the result stays the same if a second row exists.
const CONTACT_ROW = { take: 1, order: { created_at: "ASC" as const } }

class BankAccountModuleService extends MedusaService({ BankAccount, StoreContact }) {
  // Returns the store contact. Returns empty values when there is no contact row.
  async getContact(): Promise<StoreContactValues> {
    const [contact] = await this.listStoreContacts({}, CONTACT_ROW)
    return { email: contact?.email ?? null, whatsapp: contact?.whatsapp ?? null }
  }

  // Saves the store contact. The module keeps one contact row, so this method updates the row
  // when it exists and creates it only when there is none.
  async setContact(values: StoreContactValues): Promise<StoreContactValues> {
    const [existing] = await this.listStoreContacts({}, CONTACT_ROW)
    const contact = existing
      ? await this.updateStoreContacts({ id: existing.id, ...values })
      : await this.createStoreContacts(values)
    return { email: contact.email ?? null, whatsapp: contact.whatsapp ?? null }
  }
}

export default BankAccountModuleService
