import { MAX_RECEIPTS } from "../../modules/payment-receipt/constants"
import { formatRupiah, RenderedEmail } from "./html"
import { button, heading, keyValues, paragraph, renderShell, type EmailStore } from "./shell"

export type ReceiptUploadedData = {
  store: EmailStore
  order: { display_id: number }
  file_name: string
  receipt_count: number
  amount_due: number
  admin_url: string
}

// Returns the email that tells the store owner about a new receipt. The email has no image and
// no file link, because the receipt is private. The owner opens it in the Medusa Admin.
export function renderReceiptUploaded(data: ReceiptUploadedData): RenderedEmail {
  if (!data?.order || !data.admin_url) {
    throw new Error('The "receipt-uploaded" template needs an order and an admin_url.')
  }

  const subject = `Receipt uploaded for order #${data.order.display_id}`
  const intro = `The customer uploaded a receipt for order #${data.order.display_id}. Open the order to check it and capture the payment.`
  const body = [
    heading("A receipt arrived."),
    paragraph(intro),
    keyValues([
      { label: "File", value: data.file_name },
      { label: "Receipts", value: `${data.receipt_count} of ${MAX_RECEIPTS}` },
      { label: "Amount due", value: formatRupiah(data.amount_due) },
    ]),
    button(data.admin_url, "Open the order"),
    paragraph("The receipt is private. This email has no image and no file link.", true),
  ].join("\n")

  return {
    subject,
    html: renderShell({
      locale: "en-US",
      store: data.store,
      title: subject,
      preheader: intro,
      body,
      audience: "owner",
    }),
  }
}
