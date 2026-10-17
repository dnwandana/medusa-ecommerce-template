// Medusa stores a payment provider id as "pp_<identifier>_<id>". Code that finds a bank transfer
// session compares with this value.
export const BANK_TRANSFER_PROVIDER_ID = "pp_bank-transfer_bank-transfer"

// The customer has 24 hours after the order time to transfer the money and upload the receipt.
export const PAYMENT_DEADLINE_MS = 24 * 60 * 60 * 1000
