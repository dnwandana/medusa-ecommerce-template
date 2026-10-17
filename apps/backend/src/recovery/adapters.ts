// Tells the check-paid-carts job how to check the payment sessions of one gateway provider.
export type RecoveryAdapter = {
  // The stored provider id, for example "pp_<identifier>_<id>".
  providerId: string
  // The job checks this number of sessions at most in one run, so that it stays below the rate
  // limit of the gateway API.
  maxSessionsPerRun: number
  // Asks the gateway if the customer paid. It gets the data of the payment session.
  isSessionPaid(data: Record<string, unknown>): Promise<boolean>
  // Returns the payment id of the gateway for the alert email. The job uses the session id when
  // this function is absent or returns no value.
  paymentReference?(data: Record<string, unknown>): string | undefined
}

// The template has no gateway, so the list is empty. A client project that adds a gateway
// provider adds one entry here.
export const RECOVERY_ADAPTERS: RecoveryAdapter[] = []
