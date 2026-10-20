import { formatRupiah, formatWibTime, RenderedEmail } from "./html"
import {
  address,
  button,
  type EmailAddress,
  type EmailLineItem,
  type EmailStore,
  eyebrow,
  heading,
  keyValues,
  orderLines,
  part,
  renderShell,
} from "./shell"

export type NewOrderOwnerData = {
  store: EmailStore
  admin_url: string
  // The subscriber writes the label, for example "Bank transfer, waiting for the receipt".
  payment: { label: string; waiting_for_receipt: boolean }
  order: {
    display_id: number
    // ISO time of the order.
    created_at: string
    email: string
    customer_name: string | null
    total: number
    shipping_total: number
    shipping_method?: string | null
    items: EmailLineItem[]
    shipping_address?: EmailAddress | null
  }
}

// Returns the email that tells the store owner about a new order. The owner emails are English
// only.
export function renderNewOrderOwner(data: NewOrderOwnerData): RenderedEmail {
  const order = data?.order
  if (!order || !data.admin_url) {
    throw new Error('The "new-order-owner" template needs an order and an admin_url.')
  }

  const n = order.display_id
  const total = formatRupiah(order.total)
  const subject = data.payment?.waiting_for_receipt
    ? `New order #${n} · ${total} · waiting for the receipt`
    : `New order #${n} · ${total}`
  const name = order.customer_name?.trim()
  const method = order.shipping_method?.trim()
  const preheader = `${name || order.email} placed order #${n} for ${total}.`

  // keyValues escapes each value and has no line break, so the email gets its own row with no
  // label. It shows as a second line below the name.
  const customerRows = name
    ? [
        { label: "Customer", value: name },
        { label: "", value: order.email },
      ]
    : [{ label: "Customer", value: order.email }]

  const body = [
    eyebrow(`Order #${n} · ${formatWibTime(new Date(order.created_at), "en-US")}`),
    heading("New order."),
    keyValues([
      ...customerRows,
      { label: "Payment", value: data.payment?.label ?? "" },
      ...(method ? [{ label: "Shipping", value: method }] : []),
    ]),
    button(data.admin_url, "Open the order"),
    part("Lines"),
    orderLines({
      locale: "en-US",
      items: order.items ?? [],
      shipping: { method: order.shipping_method ?? null, amount: order.shipping_total },
      total: order.total,
    }),
    order.shipping_address ? address("en-US", order.shipping_address) : "",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    subject,
    html: renderShell({
      locale: "en-US",
      store: data.store,
      title: subject,
      preheader,
      body,
      audience: "owner",
    }),
  }
}
