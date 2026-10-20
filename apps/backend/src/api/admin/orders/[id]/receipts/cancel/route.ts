import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import {
  isBankTransferOrder,
  isPaymentCaptured,
  RECEIPT_BLOCK_MESSAGES,
  type PaymentOrder,
} from "../../../../../../lib/bank-transfer-order"
import { ORDER_CANCEL_NOTE, ORDER_CANCEL_REASON } from "../../../../../../lib/storefront-metadata"
import { MAX_NOTE_LENGTH } from "../../../../../../modules/payment-receipt/constants"
import { ORDER_PAYMENT_FIELDS } from "../../../../../store/orders/[id]/receipts/route"

export const STAFF_CANCEL_REASON = "staff"

// trim() runs before the length check, so the limit applies to the saved text. The check uses
// refine(), because the Medusa validator replaces the message of max() with its own.
export const PostAdminCancelOrderSchema = z
  .object({
    note: z
      .string()
      .trim()
      .refine(
        (note) => note.length <= MAX_NOTE_LENGTH,
        `Write at most ${MAX_NOTE_LENGTH} characters.`
      )
      .optional(),
  })
  .strict()

export type PostAdminCancelOrderBody = z.infer<typeof PostAdminCancelOrderSchema>

// Cancels an unpaid bank transfer order for the staff. The reason and the note go into the order
// metadata before the cancellation, because the `order.canceled` subscriber reads them for the
// email. The native Medusa cancel stays for the other orders.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminCancelOrderBody>,
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

  // The order module merges the metadata and removes a key with the value "". Thus an empty note
  // removes an old note, and the email never shows a note from an earlier attempt.
  const orderModule = req.scope.resolve(Modules.ORDER)
  const note = req.validatedBody.note ?? ""
  await orderModule.updateOrders(found.id, {
    metadata: { [ORDER_CANCEL_REASON]: STAFF_CANCEL_REASON, [ORDER_CANCEL_NOTE]: note },
  })

  try {
    await cancelOrderWorkflow(req.scope).run({
      input: { order_id: found.id, canceled_by: req.auth_context.actor_id },
    })
  } catch (error) {
    // The order is not cancelled, so the reason and the note must not stay on it.
    await orderModule.updateOrders(found.id, {
      metadata: { [ORDER_CANCEL_REASON]: "", [ORDER_CANCEL_NOTE]: "" },
    })
    throw error
  }

  res.json({ cancelled: true })
}
