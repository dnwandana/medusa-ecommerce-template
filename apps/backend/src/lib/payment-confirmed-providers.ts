import { BANK_TRANSFER_PROVIDER_ID } from "../modules/bank-transfer/constants"

// The providers that get the payment-confirmed email on `payment.captured`. A provider belongs in
// the list when it captures the payment later than the order placement. A gateway that captures at
// the redirect stays out, because the order-placed email already confirms the payment. A client
// project with a gateway edits this list.
export const PAYMENT_CONFIRMED_PROVIDERS: readonly string[] = [BANK_TRANSFER_PROVIDER_ID]

// Returns true when a capture by the provider gets the payment-confirmed email.
export function confirmsPaymentLater(providerId: string | null | undefined): boolean {
  return typeof providerId === "string" && PAYMENT_CONFIRMED_PROVIDERS.includes(providerId)
}
