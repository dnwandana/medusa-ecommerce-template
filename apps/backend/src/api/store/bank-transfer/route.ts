import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANK_ACCOUNT_MODULE } from "../../../modules/bank-account"
import type BankAccountModuleService from "../../../modules/bank-account/service"

// The storefront gets only these fields. The public fields exclude is_active and rank, because
// the customer needs only the data to make the transfer.
export const STORE_BANK_ACCOUNT_FIELDS = ["id", "bank_name", "account_number", "account_holder"]

// Returns the active bank accounts in the order that the owner set, and the store contact. The
// route needs only the publishable API key.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: BankAccountModuleService = req.scope.resolve(BANK_ACCOUNT_MODULE)

  const [accounts, contact] = await Promise.all([
    service.listBankAccounts(
      { is_active: true },
      { select: STORE_BANK_ACCOUNT_FIELDS, order: { rank: "ASC", created_at: "ASC" } }
    ),
    service.getContact(),
  ])

  // The service can add keys that the select did not ask for. Copy only the public fields.
  const bank_accounts = accounts.map((account) => ({
    id: account.id,
    bank_name: account.bank_name,
    account_number: account.account_number,
    account_holder: account.account_holder,
  }))

  res.json({ bank_accounts, contact })
}
