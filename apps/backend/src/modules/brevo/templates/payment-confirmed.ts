import { formatRupiah, formatWibDate, formatWibTime, RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import {
  button,
  type EmailLineItem,
  type EmailStore,
  eyebrow,
  heading,
  keyValues,
  orderLines,
  paragraph,
  part,
  renderShell,
} from "./shell"

export type PaymentConfirmedData = {
  locale: EmailLocale
  store: EmailStore
  order_url: string
  // The subscriber maps the provider id to the method, so the template names no provider.
  payment: { amount: number; captured_at: string; method: "bank_transfer" | "other" }
  order: {
    display_id: number
    // ISO time of the order.
    created_at: string
    first_name: string | null
    total: number
    shipping_total: number
    shipping_method?: string | null
    items: EmailLineItem[]
  }
}

// Returns the text with a capital first letter. The method label is lower case for the
// sentence, but the box shows it as a value on its own.
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Returns the email that tells the customer that the store received the payment.
export function renderPaymentConfirmed(data: PaymentConfirmedData): RenderedEmail {
  const order = data?.order
  const payment = data?.payment
  if (!order || !payment) {
    throw new Error('The "payment-confirmed" template needs an order and a payment.')
  }

  const { locale, store } = data
  const n = order.display_id
  const subject = t(locale, "paymentConfirmed.subject", { n })
  const capturedAt = new Date(payment.captured_at)
  const method =
    payment.method === "bank_transfer"
      ? t(locale, "payment.method.bankTransfer")
      : t(locale, "payment.method.other")
  const name = order.first_name?.trim()
  const intro = name
    ? t(locale, "paymentConfirmed.intro", { name, method })
    : t(locale, "paymentConfirmed.introNoName", { method })

  const body = [
    eyebrow(t(locale, "paymentConfirmed.eyebrow", { n, date: formatWibDate(capturedAt, locale) })),
    heading(t(locale, "paymentConfirmed.heading")),
    paragraph(intro),
    keyValues([
      {
        label: t(locale, "paymentConfirmed.amount"),
        value: formatRupiah(payment.amount),
        strong: true,
      },
      { label: t(locale, "paymentConfirmed.received"), value: formatWibTime(capturedAt, locale) },
      { label: t(locale, "paymentConfirmed.method"), value: capitalize(method) },
    ]),
    button(data.order_url, t(locale, "common.viewOrder")),
    part(t(locale, "common.yourOrder")),
    orderLines({
      locale,
      items: order.items ?? [],
      shipping: { method: order.shipping_method ?? null, amount: order.shipping_total },
      total: order.total,
    }),
  ].join("\n")

  return {
    subject,
    html: renderShell({
      locale,
      store,
      title: subject,
      preheader: intro,
      body,
      audience: "customer",
    }),
  }
}
