import { generateEntityId } from "@medusajs/framework/utils"
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import {
  PAYMENT_RECEIPT_UPLOADED,
  RECEIPT_EXTENSIONS,
  type ReceiptMimeType,
} from "../modules/payment-receipt/constants"
import { createPaymentReceiptStep } from "./steps/create-payment-receipt"
import { storeReceiptFileStep } from "./steps/store-receipt-file"

export type UploadPaymentReceiptInput = {
  order_id: string
  file_name: string
  mime_type: ReceiptMimeType
  /** The file as base64 text. The route already checked the bytes, the size and the type. */
  content: string
}

// created_at is an ISO string, because the engine sends the workflow result through JSON.
export type UploadPaymentReceiptResult = { id: string; file_name: string; created_at: string }

// Saves a receipt of an order: first the file, then the row. The event goes out only after both
// writes succeed. The route checks the order rules and the receipt count before it runs this.
export const uploadPaymentReceiptWorkflow = createWorkflow(
  "upload-payment-receipt",
  function (input: UploadPaymentReceiptInput) {
    // The id is made before the row, because the file key contains it.
    const receipt = transform({ input }, ({ input }) => {
      const id = generateEntityId(undefined, "prcpt")
      return {
        id,
        order_id: input.order_id,
        file_key: `${input.order_id}/${id}.${RECEIPT_EXTENSIONS[input.mime_type]}`,
        file_name: input.file_name,
        mime_type: input.mime_type,
        size: Buffer.byteLength(input.content, "base64"),
      }
    })

    storeReceiptFileStep({
      key: receipt.file_key,
      content: input.content,
      mime_type: input.mime_type,
    })

    const created = createPaymentReceiptStep(receipt)

    const eventData = transform({ receipt }, ({ receipt }) => ({
      id: receipt.id,
      order_id: receipt.order_id,
    }))
    emitEventStep({ eventName: PAYMENT_RECEIPT_UPLOADED, data: eventData })

    // The engine also resolves the response when a step fails, so created can be undefined here.
    const result = transform(
      { created },
      ({ created }): UploadPaymentReceiptResult =>
        created && {
          id: created.id,
          file_name: created.file_name,
          created_at: new Date(created.created_at).toISOString(),
        }
    )

    return new WorkflowResponse(result)
  }
)
