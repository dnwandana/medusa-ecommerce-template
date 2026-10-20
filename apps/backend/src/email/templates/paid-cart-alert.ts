import { formatRupiah, RenderedEmail } from "./html"
import { heading, keyValues, paragraph, renderShell, type EmailStore } from "./shell"

export type PaidCartAlertData = {
  store: EmailStore
  cart_id: string
  provider_id: string
  payment_reference: string
  customer_email?: string
  amount: number
}

function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

// Renders the email that tells the store owner about a paid cart with no order. The data has no
// admin URL, so the email has no button. The text tells the owner what to do.
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
  const intro = "A customer paid for a cart, but the store did not create the order."
  const body = [
    heading("A paid cart has no order."),
    paragraph(intro),
    keyValues([
      { label: "Cart", value: data.cart_id },
      { label: "Provider", value: data.provider_id },
      { label: "Reference", value: data.payment_reference },
      { label: "Customer", value: data.customer_email || "No email address on the cart" },
      { label: "Amount", value: formatRupiah(data.amount), strong: true },
    ]),
    paragraph(
      "Find the payment reference in the dashboard of the payment provider. Then create the order in the Medusa Admin, or return the money to the customer."
    ),
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
