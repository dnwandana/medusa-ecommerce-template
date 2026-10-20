import { formatWibDate, RenderedEmail } from "./html"
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
  renderShell,
} from "./shell"

export type OrderDeliveredData = {
  locale: EmailLocale
  store: EmailStore
  order_url: string
  order: { display_id: number }
  // delivered_at is the ISO time of the delivery.
  delivery: { delivered_at: string; items: EmailLineItem[] }
}

// Returns the email that tells the customer that a parcel of the order arrived. It lists only
// the items of this delivery, with no prices.
export function renderOrderDelivered(data: OrderDeliveredData): RenderedEmail {
  const order = data?.order
  const delivery = data?.delivery
  if (!order || !delivery) {
    throw new Error('The "order-delivered" template needs an order and a delivery.')
  }

  const { locale, store } = data
  const n = order.display_id
  const subject = t(locale, "orderDelivered.subject", { n })
  const date = formatWibDate(new Date(delivery.delivered_at), locale)
  const intro = t(locale, "orderDelivered.intro", { date })

  // The items carry no unit_price, so orderLines renders no amount column.
  const items = (delivery.items ?? []).map((item) => ({
    title: item.title,
    variant_title: item.variant_title,
    quantity: item.quantity,
  }))

  const body = [
    eyebrow(t(locale, "orderDelivered.eyebrow", { n, date })),
    heading(t(locale, "orderDelivered.heading")),
    paragraph(intro),
    button(data.order_url, t(locale, "common.viewOrder")),
    part(t(locale, "orderDelivered.inDelivery")),
    orderLines({ locale, items }),
    paragraph(t(locale, "orderDelivered.problem"), true),
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
