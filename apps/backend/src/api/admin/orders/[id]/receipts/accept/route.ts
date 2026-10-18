import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"
import {
  capturablePaymentId,
  isBankTransferOrder,
  RECEIPT_BLOCK_MESSAGES,
  type PaymentOrder,
} from "../../../../../../lib/bank-transfer-order"
import { ORDER_PAYMENT_FIELDS } from "../../../../../store/orders/[id]/receipts/route"

// Captures the full amount of the bank transfer payment of the order. A gateway payment of the
// same order is never captured here. The customer gets no email.
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
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
  const paymentId = capturablePaymentId(order)
  if (!paymentId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The payment of this order has no amount to capture."
    )
  }

  await capturePaymentWorkflow(req.scope).run({
    input: { payment_id: paymentId, captured_by: req.auth_context.actor_id },
  })

  res.json({ captured: true })
}
