import { PaymentActions } from "@medusajs/framework/utils"
import BankTransferProviderService from "../service"
import { BANK_TRANSFER_PROVIDER_ID } from "../constants"

const service = () => new BankTransferProviderService({} as any, {})
const customer = {
  first_name: "Budi",
  last_name: "Santoso",
  email: "buyer@example.com",
  phone: "+6281234567890",
}

describe("bank transfer provider", () => {
  it("has the identifier and the constants of the spec", () => {
    expect(BankTransferProviderService.identifier).toBe("bank-transfer")
    expect(BANK_TRANSFER_PROVIDER_ID).toBe("pp_bank-transfer_bank-transfer")
  })

  it("starts a session with no payment_url and does not keep the customer", async () => {
    const result = await service().initiatePayment({
      amount: 150000,
      currency_code: "idr",
      data: { customer },
    } as any)
    expect(typeof result.id).toBe("string")
    expect(result.data).not.toHaveProperty("payment_url")
    expect(result.data).not.toHaveProperty("customer")
  })

  it("authorizes at once", async () => {
    const result = await service().authorizePayment({ data: { a: 1 } } as any)
    expect(result).toEqual({ status: "authorized", data: { a: 1 } })
  })

  it.each([
    "capturePayment",
    "refundPayment",
    "cancelPayment",
    "deletePayment",
    "retrievePayment",
    "updatePayment",
  ])("%s returns the session data with no external call", async (method) => {
    const result = await (service() as any)[method]({ data: { a: 1 }, amount: 1000 })
    expect(result).toEqual({ data: { a: 1 } })
  })

  it("reports the status authorized", async () => {
    expect(await service().getPaymentStatus({ data: {} } as any)).toEqual({ status: "authorized" })
  })

  it("does not support webhooks", async () => {
    const result = await service().getWebhookActionAndData({} as any)
    expect(result).toEqual({ action: PaymentActions.NOT_SUPPORTED })
  })
})
