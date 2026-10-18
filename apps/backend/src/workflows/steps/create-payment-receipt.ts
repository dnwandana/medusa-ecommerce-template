import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PAYMENT_RECEIPT_MODULE } from "../../modules/payment-receipt"
import type PaymentReceiptModuleService from "../../modules/payment-receipt/service"

export type CreatePaymentReceiptStepInput = {
  id: string
  order_id: string
  file_key: string
  file_name: string
  mime_type: string
  size: number
}

// Saves the receipt row. The compensation function deletes it.
export const createPaymentReceiptStep = createStep(
  "create-payment-receipt",
  async (input: CreatePaymentReceiptStepInput, { container }) => {
    const service: PaymentReceiptModuleService = container.resolve(PAYMENT_RECEIPT_MODULE)
    const receipt = await service.createPaymentReceipts(input)
    return new StepResponse(receipt, receipt.id)
  },
  async (receiptId: string | undefined, { container }) => {
    if (!receiptId) {
      return
    }
    const service: PaymentReceiptModuleService = container.resolve(PAYMENT_RECEIPT_MODULE)
    await service.deletePaymentReceipts(receiptId)
  }
)
