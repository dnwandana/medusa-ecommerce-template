import { formatRupiah, formatWibDate, RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import {
  button,
  type EmailLineItem,
  type EmailStore,
  eyebrow,
  heading,
  orderLines,
  paragraph,
  part,
  quote,
  renderShell,
} from "./shell"

export type OrderCancelledData = {
  locale: EmailLocale
  store: EmailStore
  shop_url: string
  reason: "payment_timeout" | "staff"
  // The hours of BANK_TRANSFER_DEADLINE_HOURS. The timeout text names them, so a timeout email
  // needs them. A staff cancel has none.
  deadline_hours?: number | null
  note?: string | null
  // The captured payment of the order. It is absent when nothing was captured, so the email
  // promises no refund.
  refund?: { amount: number; method: "bank_transfer" | "gateway" } | null
  order: {
    display_id: number
    // ISO time of the order.
    created_at: string
    total: number
    shipping_total: number
    shipping_method?: string | null
    items: EmailLineItem[]
  }
}

// Returns the timeout text. A timeout email with no hours would tell the customer a wrong
// deadline, so the render stops.
function timeoutText(locale: EmailLocale, data: OrderCancelledData, n: number): string {
  const hours = data.deadline_hours
  if (hours === undefined || hours === null) {
    throw new Error('The "order-cancelled" template needs deadline_hours for a payment timeout.')
  }
  return t(locale, "orderCancelled.timeout", { n, hours })
}

// Returns the paragraphs that give the reason, the staff note, and the refund line.
function reasonBlocks(locale: EmailLocale, data: OrderCancelledData, n: number): string[] {
  // A timeout order has no captured payment, so the timeout wording never has a refund line.
  if (data.reason === "payment_timeout") {
    return [
      paragraph(timeoutText(locale, data, n)),
      paragraph(t(locale, "orderCancelled.timeoutNext")),
    ]
  }

  // A note of only spaces counts as no note.
  const note = typeof data.note === "string" ? data.note.trim() : ""
  const blocks = note
    ? // quote escapes the note before it changes the line breaks to <br>.
      [paragraph(t(locale, "orderCancelled.staffNote", { n })), quote(note)]
    : [paragraph(t(locale, "orderCancelled.staff", { n }))]

  const refund = data.refund
  if (refund?.method === "bank_transfer") {
    blocks.push(
      paragraph(t(locale, "orderCancelled.refundBank", { amount: formatRupiah(refund.amount) }))
    )
  } else if (refund?.method === "gateway") {
    blocks.push(paragraph(t(locale, "orderCancelled.refundGateway")))
  }
  return blocks
}

// Returns the email that tells the customer that the order is cancelled. The reason selects the
// wording: the payment timeout or a cancel by the store staff.
export function renderOrderCancelled(data: OrderCancelledData): RenderedEmail {
  const order = data?.order
  if (!order) {
    throw new Error('The "order-cancelled" template needs an order.')
  }

  const { locale, store } = data
  const n = order.display_id
  const subject = t(locale, "orderCancelled.subject", { n })
  const preheader =
    data.reason === "payment_timeout"
      ? timeoutText(locale, data, n)
      : t(locale, "orderCancelled.staff", { n })

  const body = [
    eyebrow(
      t(locale, "orderCancelled.eyebrow", {
        n,
        date: formatWibDate(new Date(order.created_at), locale),
      })
    ),
    heading(t(locale, "orderCancelled.heading")),
    ...reasonBlocks(locale, data, n),
    button(data.shop_url, t(locale, "orderCancelled.shopAgain")),
    part(t(locale, "orderCancelled.lines")),
    orderLines({
      locale,
      items: order.items ?? [],
      shipping: { method: order.shipping_method ?? null, amount: order.shipping_total },
      total: order.total,
    }),
  ].join("\n")

  return {
    subject,
    html: renderShell({ locale, store, title: subject, preheader, body, audience: "customer" }),
  }
}
