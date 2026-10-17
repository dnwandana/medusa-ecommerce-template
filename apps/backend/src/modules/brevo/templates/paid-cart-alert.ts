import { escapeHtml, formatRupiah, layout, RenderedEmail } from "./html"

export type PaidCartAlertData = {
  cart_id: string
  provider_id: string
  payment_reference: string
  customer_email?: string
  amount: number
}

const cell = "padding:8px 0;border-bottom:1px solid #eee;"

function renderRow(label: string, value: string): string {
  return `<tr><th style="${cell}text-align:left;">${escapeHtml(label)}</th><td style="${cell}">${escapeHtml(value)}</td></tr>`
}

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

// Renders the email that tells the store owner about a paid cart with no order.
export function renderPaidCartAlert(data: PaidCartAlertData): RenderedEmail {
  if (
    !hasValue(data?.cart_id) ||
    !hasValue(data?.provider_id) ||
    !hasValue(data?.payment_reference) ||
    typeof data?.amount !== "number"
  ) {
    throw new Error(
      'The "paid-cart-alert" template needs cart_id, provider_id, payment_reference, and amount.'
    )
  }

  const subject = `Paid cart with no order: ${data.cart_id}`
  const customer = data.customer_email || "No email address on the cart"

  const rows = [
    renderRow("Cart", data.cart_id),
    renderRow("Payment provider", data.provider_id),
    renderRow("Payment reference", data.payment_reference),
    renderRow("Customer", customer),
    renderRow("Amount", formatRupiah(data.amount)),
  ].join("\n")

  const body = [
    "<p>A customer paid for a cart, but the store did not create the order.</p>",
    `<table style="width:100%;border-collapse:collapse;">\n${rows}\n</table>`,
    "<p>Find the payment reference in the dashboard of the payment provider. Then create the order in the Medusa Admin, or return the money to the customer.</p>",
  ].join("\n")

  return { subject, html: layout(subject, body) }
}
