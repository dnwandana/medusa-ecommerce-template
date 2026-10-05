import MayarPaymentProviderService from "../service"
import type { MayarOptions } from "../types"

export const defaultOptions: MayarOptions = {
  apiUrl: "https://api.mayar.io/hl/v2",
  apiKey: "test-key",
  storefrontUrl: "http://localhost:3000",
}

// Makes the provider with a fake client, so that no test calls the Mayar API.
export const makeService = (options: Partial<MayarOptions> = {}) => {
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const client = { createInvoice: jest.fn(), getInvoice: jest.fn(), closeInvoice: jest.fn() }
  const service = new MayarPaymentProviderService({ logger } as any, {
    ...defaultOptions,
    ...options,
  })
  ;(service as any).client_ = client
  return { service, client, logger }
}

// The session data that `initiatePayment` stores for a cart of IDR 95,000.
export const sessionData = {
  session_id: "payses_1",
  customer: { name: "Budi Santoso", email: "buyer@example.com", mobile: "081234567890" },
  invoice_id: "inv_1",
  payment_url: "https://store.myr.id/invoices/abc",
  expired_at: "2026-10-03T00:00:00.000Z",
  amount: 95000,
}
