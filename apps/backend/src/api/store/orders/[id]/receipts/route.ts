import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  RECEIPT_BLOCK_MESSAGES,
  receiptBlockReason,
  type PaymentOrder,
} from "../../../../../lib/bank-transfer-order"
import { PAYMENT_RECEIPT_MODULE } from "../../../../../modules/payment-receipt"
import {
  MAX_RECEIPT_BYTES,
  SIZE_MESSAGE,
  TYPE_MESSAGE,
} from "../../../../../modules/payment-receipt/constants"
import {
  cleanFileName,
  decodeReceipt,
  detectReceiptType,
} from "../../../../../modules/payment-receipt/file-rules"
import type PaymentReceiptModuleService from "../../../../../modules/payment-receipt/service"
import { uploadPaymentReceiptWorkflow } from "../../../../../workflows/upload-payment-receipt"

export const PostStoreReceiptSchema = z
  .object({
    file_name: z.string().trim().min(1).max(255),
    content: z.string().min(1),
  })
  .strict()

export type PostStoreReceiptBody = z.infer<typeof PostStoreReceiptSchema>

// The order fields that the payment rules of lib/bank-transfer-order.ts read.
export const ORDER_PAYMENT_FIELDS = [
  "id",
  "status",
  "display_id",
  "created_at",
  "payment_collections.status",
  "payment_collections.payment_sessions.provider_id",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.canceled_at",
]

// The upload route and the payment timeout job take this lock, so a job never cancels an order
// while a receipt for that order goes in.
export const receiptLockKey = (orderId: string): string => `payment-receipt:${orderId}`

// Saves a receipt for a bank transfer order. A guest uploads with the order id only. The answer
// has no file key and no URL, because only the admin file route reads the file.
export const POST = async (
  req: MedusaRequest<PostStoreReceiptBody>,
  res: MedusaResponse
): Promise<void> => {
  const orderId = req.params.id
  const { file_name, content } = req.validatedBody

  // Check the bytes before the lock. The stored type comes from the bytes, not from the name.
  const bytes = decodeReceipt(content)
  if (!bytes) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, TYPE_MESSAGE)
  }
  if (bytes.length > MAX_RECEIPT_BYTES) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, SIZE_MESSAGE)
  }
  const mimeType = detectReceiptType(bytes)
  if (!mimeType) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, TYPE_MESSAGE)
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const service: PaymentReceiptModuleService = req.scope.resolve(PAYMENT_RECEIPT_MODULE)

  // The lock makes the count and the insert one step for each order. Without it, two uploads at
  // the same time both see two receipts and the order gets four.
  const receipt = await req.scope
    .resolve(Modules.LOCKING)
    .execute(receiptLockKey(orderId), async () => {
      const {
        data: [order],
      } = await query.graph({
        entity: "order",
        filters: { id: orderId },
        fields: ORDER_PAYMENT_FIELDS,
      })
      if (!order) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "The order does not exist.")
      }

      const count = await service.countReceipts(orderId)
      const block = receiptBlockReason(order as unknown as PaymentOrder, count)
      if (block) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, RECEIPT_BLOCK_MESSAGES[block])
      }

      const { result } = await uploadPaymentReceiptWorkflow(req.scope).run({
        input: {
          order_id: orderId,
          file_name: cleanFileName(file_name),
          mime_type: mimeType,
          content,
        },
      })
      return result
    })

  res.status(201).json({ receipt })
}
