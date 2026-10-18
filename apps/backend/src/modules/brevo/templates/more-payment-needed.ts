import { emailButton, escapeHtml, greeting, layout, RenderedEmail } from "./html"

export type MorePaymentNeededData = {
  order: { display_id: number; first_name: string | null }
  note: string
  order_url: string
}

// Returns the email that gives the customer the owner note after "Ask for more".
export function renderMorePaymentNeeded(data: MorePaymentNeededData): RenderedEmail {
  if (!data?.order || typeof data.note !== "string" || !data.order_url) {
    throw new Error('The "more-payment-needed" template needs an order, a note and an order_url.')
  }

  const subject = `More payment is needed for order #${data.order.display_id}`
  // The note is escaped first, so only the line breaks become HTML.
  const note = escapeHtml(data.note).replace(/\r?\n/g, "<br>")

  const body = [
    `<p>${greeting(data.order.first_name)}</p>`,
    `<p>${escapeHtml(`We checked your receipt for order #${data.order.display_id}. The store needs more payment.`)}</p>`,
    `<blockquote style="margin:16px 0;padding:8px 16px;border-left:4px solid #1d1b18;background:#f6f6f6;">${note}</blockquote>`,
    "<p>Transfer the difference, then upload one more receipt on the order page.</p>",
    emailButton(data.order_url, "Open your order"),
  ].join("\n")

  return { subject, html: layout(subject, body) }
}
