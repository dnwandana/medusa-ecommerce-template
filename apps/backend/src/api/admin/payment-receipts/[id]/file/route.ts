import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PAYMENT_RECEIPT_MODULE } from "../../../../../modules/payment-receipt"
import type PaymentReceiptModuleService from "../../../../../modules/payment-receipt/service"

const NOT_FOUND = "The receipt does not exist."

// Returns the Content-Disposition value. The plain filename has only printable ASCII and no quote,
// and filename* (RFC 5987) keeps the full name.
export function inlineDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_")
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

// Sends the bytes of a receipt. The route is below /admin, so only an admin can read a receipt.
// A shared cache must not keep the file, and the browser must not read it as another type.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: PaymentReceiptModuleService = req.scope.resolve(PAYMENT_RECEIPT_MODULE)
  const [receipt] = await service.listPaymentReceipts(
    { id: req.params.id },
    { select: ["id", "file_key", "file_name", "mime_type"] }
  )
  if (!receipt) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, NOT_FOUND)
  }
  const bytes = await service.getFile(receipt.file_key)
  if (!bytes) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, NOT_FOUND)
  }

  res.setHeader("Content-Type", receipt.mime_type)
  res.setHeader("Content-Disposition", inlineDisposition(receipt.file_name))
  res.setHeader("Cache-Control", "private, no-store")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.send(bytes)
}
