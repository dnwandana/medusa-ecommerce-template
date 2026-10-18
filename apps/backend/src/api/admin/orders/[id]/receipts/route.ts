import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PAYMENT_RECEIPT_MODULE } from "../../../../../modules/payment-receipt"
import type PaymentReceiptModuleService from "../../../../../modules/payment-receipt/service"

// Returns the receipts of an order, oldest first, and the newest owner note. The answer has no
// file key. The order widget reads each file through /admin/payment-receipts/:id/file.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: PaymentReceiptModuleService = req.scope.resolve(PAYMENT_RECEIPT_MODULE)
  const [state] = await service.receiptStates([req.params.id])

  res.json({ receipts: state.receipts, note: state.note })
}
