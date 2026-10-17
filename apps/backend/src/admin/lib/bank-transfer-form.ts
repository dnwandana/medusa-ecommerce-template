export type BankAccountForm = { bank_name: string; account_number: string; account_holder: string }

export type AdminBankAccount = BankAccountForm & {
  id: string
  is_active: boolean
  rank: number
}

export type StoreContact = { email: string | null; whatsapp: string | null }

// The same rule as the account number schema of POST /admin/bank-accounts.
const ACCOUNT_NUMBER = /^\d{5,20}$/

/** Returns an error text for each field that POST /admin/bank-accounts does not accept. */
export function validateBankAccountForm(
  form: BankAccountForm
): Partial<Record<keyof BankAccountForm, string>> {
  const errors: Partial<Record<keyof BankAccountForm, string>> = {}
  if (!form.bank_name.trim()) {
    errors.bank_name = "Enter the bank name."
  }
  if (!ACCOUNT_NUMBER.test(form.account_number.trim())) {
    errors.account_number = "Enter 5 to 20 digits."
  }
  if (!form.account_holder.trim()) {
    errors.account_holder = "Enter the account holder."
  }
  return errors
}

/**
 * Returns the new ranks after the account moves one place up or down. The result has only the
 * accounts whose rank changes and the two accounts that change places.
 */
export function moveAccount(
  accounts: { id: string; rank: number }[],
  id: string,
  direction: "up" | "down"
): { id: string; rank: number }[] {
  // Array.prototype.sort is stable, so accounts with the same rank keep the list order.
  const ordered = [...accounts].sort((a, b) => a.rank - b.rank)
  const from = ordered.findIndex((account) => account.id === id)
  const to = direction === "up" ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= ordered.length) {
    return []
  }

  const moved = [...ordered]
  ;[moved[from], moved[to]] = [moved[to], moved[from]]

  // Each account gets its own rank. Two accounts with the same rank cannot change places.
  const swapped = new Set([moved[from].id, moved[to].id])
  const oldRank = new Map(accounts.map((account) => [account.id, account.rank]))
  return moved
    .map((account, index) => ({ id: account.id, rank: index }))
    .filter((account) => swapped.has(account.id) || oldRank.get(account.id) !== account.rank)
}

/** Returns the WhatsApp number in the E.164 format. A local number starts with 0. */
function toE164(value: string): string {
  const digits = value.replace(/\D/g, "")
  if (value.startsWith("+")) {
    return `+${digits}`
  }
  if (digits.startsWith("0")) {
    return `+62${digits.slice(1)}`
  }
  if (digits.startsWith("62")) {
    return `+${digits}`
  }
  // POST /admin/store-contact rejects this value, and the page shows the error.
  return value
}

/** Returns the body of POST /admin/store-contact. The route accepts null, not an empty string. */
export function toContactPayload(form: { email: string; whatsapp: string }): StoreContact {
  const email = form.email.trim()
  const whatsapp = form.whatsapp.trim()
  return { email: email || null, whatsapp: whatsapp ? toE164(whatsapp) : null }
}
