export type MayarOptions = {
  apiUrl: string
  apiKey: string
  storefrontUrl: string
}

export type MayarCustomer = {
  name: string
  email: string
  mobile: string
}

export type MayarInvoiceInput = MayarCustomer & {
  description: string
  redirectUrl: string
  expiredAt: string
  items: { quantity: number; rate: number; description: string }[]
  extraData: Record<string, string>
}

export type MayarCreatedInvoice = {
  id: string
  link: string
  transactionId?: string
  expiredAt?: number
}

export type MayarInvoice = {
  id: string
  amount: number | string
  status: string
  expiredAt?: number
  paymentUrl?: string
  extraData?: Record<string, unknown> | null
  transactions?: { id: string; extraData?: Record<string, unknown> | null }[]
}

// The data that the provider stores on the Medusa payment session. Medusa merges it with the
// data that the storefront sent, so the session also holds `session_id` and `customer`.
export type MayarSessionData = {
  invoice_id: string
  payment_url: string
  expired_at: string
  amount: number
}
