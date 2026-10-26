export type BankAccount = {
  id: string
  bank_name: string
  account_number: string
  account_holder: string
}

// `enabled` is the bank transfer switch of the backend. `deadline_hours` is the time that the
// customer has to pay. The checkout needs both values before an order exists.
export type BankTransferDetails = {
  bank_accounts: BankAccount[]
  contact: { email: string | null; whatsapp: string | null }
  enabled: boolean
  deadline_hours: number
}

// Returns the function that reads the bank transfer details from the Store API.
export function useBankTransfer(): { getDetails(): Promise<BankTransferDetails> } {
  // The Nuxt context is not available after an await. Get the client here.
  const sdk = useMedusa()

  // The backend returns only the active accounts, in the order that the store owner set.
  async function getDetails(): Promise<BankTransferDetails> {
    return sdk.client.fetch<BankTransferDetails>("/store/bank-transfer")
  }

  return { getDetails }
}
