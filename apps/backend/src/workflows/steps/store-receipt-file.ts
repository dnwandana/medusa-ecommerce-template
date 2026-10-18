import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PAYMENT_RECEIPT_MODULE } from "../../modules/payment-receipt"
import type { ReceiptMimeType } from "../../modules/payment-receipt/constants"
import type PaymentReceiptModuleService from "../../modules/payment-receipt/service"

export type StoreReceiptFileStepInput = {
  key: string
  /** The file as base64 text. The route already checked it. */
  content: string
  mime_type: ReceiptMimeType
}

// Writes the receipt file to the receipt storage. The compensation function removes the file.
export const storeReceiptFileStep = createStep(
  "store-receipt-file",
  async (input: StoreReceiptFileStepInput, { container }) => {
    const service: PaymentReceiptModuleService = container.resolve(PAYMENT_RECEIPT_MODULE)
    await service.putFile(input.key, Buffer.from(input.content, "base64"), input.mime_type)
    return new StepResponse(input.key, input.key)
  },
  async (key: string | undefined, { container }) => {
    if (!key) {
      return
    }
    const service: PaymentReceiptModuleService = container.resolve(PAYMENT_RECEIPT_MODULE)
    await service.removeFile(key)
  }
)
