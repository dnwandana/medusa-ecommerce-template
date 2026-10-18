import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  isBankTransferOrder,
  isPaymentCaptured,
  RECEIPT_BLOCK_MESSAGES,
  type PaymentOrder,
} from "../../../../../../lib/bank-transfer-order"
import { PAYMENT_RECEIPT_MODULE } from "../../../../../../modules/payment-receipt"
import {
  MAX_NOTE_LENGTH,
  PAYMENT_MORE_REQUESTED,
} from "../../../../../../modules/payment-receipt/constants"
import type PaymentReceiptModuleService from "../../../../../../modules/payment-receipt/service"
import { ORDER_PAYMENT_FIELDS } from "../../../../../store/orders/[id]/receipts/route"

// trim() runs before the length checks, so the limits apply to the saved text. The checks use
// refine(), because the Medusa validator replaces the messages of min() and max() with its own.
export const PostAdminAskForMoreSchema = z
  .object({
    note: z
      .string()
      .trim()
      .refine((note) => note.length > 0, "Write a note for the customer.")
      .refine(
        (note) => note.length <= MAX_NOTE_LENGTH,
        `Write at most ${MAX_NOTE_LENGTH} characters.`
      ),
  })
  .strict()

export type PostAdminAskForMoreBody = z.infer<typeof PostAdminAskForMoreSchema>

// Saves an owner note for the customer. A note newer than the newest receipt moves the order back
// to "Waiting for payment". The route does not change the receipts or the payment. The event
// sends the email to the customer.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminAskForMoreBody>,
  res: MedusaResponse
): Promise<void> => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [found],
  } = await query.graph({
    entity: "order",
    filters: { id: req.params.id },
    fields: ORDER_PAYMENT_FIELDS,
  })
  if (!found) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "The order does not exist.")
  }
  const order = found as unknown as PaymentOrder

  if (!isBankTransferOrder(order)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, RECEIPT_BLOCK_MESSAGES.not_bank_transfer)
  }
  if (order.status === "canceled") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, RECEIPT_BLOCK_MESSAGES.cancelled)
  }
  if (isPaymentCaptured(order)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, RECEIPT_BLOCK_MESSAGES.captured)
  }

  // One record of one module, so the route calls the service and needs no workflow.
  const service: PaymentReceiptModuleService = req.scope.resolve(PAYMENT_RECEIPT_MODULE)
  const note = await service.createPaymentNotes({
    order_id: found.id,
    note: req.validatedBody.note,
  })

  await req.scope.resolve(Modules.EVENT_BUS).emit({
    name: PAYMENT_MORE_REQUESTED,
    data: { order_id: found.id, note_id: note.id },
  })

  res.json({ note: { id: note.id, note: note.note, created_at: note.created_at } })
}
