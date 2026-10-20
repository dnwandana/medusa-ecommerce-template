import { RenderedEmail } from "./html"
import { button, type EmailStore, heading, keyValues, paragraph, renderShell } from "./shell"

export type LowStockOwnerData = {
  store: EmailStore
  admin_url: string
  threshold: number
  product_title: string
  variant_title: string | null
  sku: string | null
  available: number
}

// Returns the email that tells the store owner that a variant crossed the low stock threshold.
// The owner emails are English only.
export function renderLowStockOwner(data: LowStockOwnerData): RenderedEmail {
  if (!data?.product_title || !data.admin_url) {
    throw new Error('The "low-stock-owner" template needs a product_title and an admin_url.')
  }

  const product = data.product_title
  const variant = data.variant_title?.trim()
  const sku = data.sku?.trim()
  const n = data.available
  const subject = variant
    ? `Low stock: ${product}, ${variant} (${n} left)`
    : `Low stock: ${product} (${n} left)`
  const intro = `The stock of a variant crossed the low stock threshold (${data.threshold}).`

  const body = [
    heading("Running low."),
    paragraph(intro),
    keyValues([
      { label: "Product", value: product },
      ...(variant ? [{ label: "Variant", value: variant }] : []),
      ...(sku ? [{ label: "SKU", value: sku }] : []),
      { label: "Stock left", value: String(n), strong: true },
    ]),
    button(data.admin_url, "Open the product"),
    paragraph("You get one email per crossing. A restock above the threshold resets it.", true),
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
