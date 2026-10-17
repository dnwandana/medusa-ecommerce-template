export type BankAccount = {
  id: string
  bank_name: string
  account_number: string
  account_holder: string
}

export type BankTransferDetails = {
  bank_accounts: BankAccount[]
  contact: { email: string | null; whatsapp: string | null }
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
