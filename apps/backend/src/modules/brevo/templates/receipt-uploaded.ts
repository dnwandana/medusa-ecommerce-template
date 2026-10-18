import { MAX_RECEIPTS } from "../../payment-receipt/constants"
import { emailButton, escapeHtml, layout, RenderedEmail } from "./html"

export type ReceiptUploadedData = {
  order: { display_id: number }
  file_name: string
  receipt_count: number
  admin_url: string
}

// Returns the email that tells the store owner about a new receipt. The email has no image and
// no file link, because the receipt is private. The owner opens it in the Medusa Admin.
export function renderReceiptUploaded(data: ReceiptUploadedData): RenderedEmail {
  if (!data?.order || !data.admin_url) {
    throw new Error('The "receipt-uploaded" template needs an order and an admin_url.')
  }

  const subject = `Receipt uploaded for order #${data.order.display_id}`
  const body = [
    `<p>${escapeHtml(`The customer uploaded a receipt for order #${data.order.display_id}.`)}</p>`,
    `<p>${escapeHtml(`File: ${data.file_name}`)}<br>${escapeHtml(`${data.receipt_count} of ${MAX_RECEIPTS} receipts`)}</p>`,
    emailButton(data.admin_url, "Open the order"),
  ].join("\n")

  return { subject, html: layout(subject, body) }
}
