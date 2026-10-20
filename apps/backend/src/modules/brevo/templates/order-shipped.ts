import { formatWibDate, RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import {
  address,
  button,
  type EmailAddress,
  type EmailLineItem,
  type EmailStore,
  eyebrow,
  heading,
  isHttpsUrl,
  keyValues,
  orderLines,
  paragraph,
  paragraphHtml,
  part,
  renderShell,
  textLink,
} from "./shell"

export type OrderShippedLabel = { tracking_number: string; tracking_url?: string | null }

export type OrderShippedData = {
  locale: EmailLocale
  store: EmailStore
  order_url: string
  order: { display_id: number; shipping_address?: EmailAddress | null }
  shipment: {
    // ISO time of the shipment.
    shipped_at: string
    option_name?: string | null
    items: EmailLineItem[]
    labels: OrderShippedLabel[]
  }
}

// Returns the email that tells the customer that a shipment of the order is on its way. It lists
// only the items of this shipment, with no prices.
export function renderOrderShipped(data: OrderShippedData): RenderedEmail {
  const order = data?.order
  if (!order) {
    throw new Error('The "order-shipped" template needs an order.')
  }
  const shipment = data.shipment
  if (!shipment) {
    throw new Error('The "order-shipped" template needs a shipment.')
  }

  const { locale, store } = data
  const n = order.display_id
  const subject = t(locale, "orderShipped.subject", { n })
  const date = formatWibDate(new Date(shipment.shipped_at), locale)
  const method = shipment.option_name?.trim()
  const intro = method
    ? t(locale, "orderShipped.shippedWith", { date, method })
    : t(locale, "orderShipped.shipped", { date })

  const labels = (shipment.labels ?? []).filter(Boolean)
  const trackingRows = labels
    .map((label) => label.tracking_number?.trim())
    .filter((number): number is string => !!number)
    .map((number) => ({
      label: t(locale, "orderShipped.trackingNumber"),
      value: number,
      strong: true,
    }))
  // The courier row only adds to a box with a tracking number. Alone, it repeats the intro.
  const rows = trackingRows.length
    ? [
        ...trackingRows,
        ...(method ? [{ label: t(locale, "orderShipped.courier"), value: method }] : []),
      ]
    : []
  // Staff type the tracking URL. Only an https URL goes into a link.
  const trackUrl = labels.map((label) => label.tracking_url).find(isHttpsUrl)

  // The items carry no unit_price, so orderLines renders no amount column.
  const items = (shipment.items ?? []).map((item) => ({
    title: item.title,
    variant_title: item.variant_title,
    quantity: item.quantity,
  }))

  const body = [
    eyebrow(t(locale, "orderShipped.eyebrow", { n, date })),
    heading(t(locale, "orderShipped.heading")),
    paragraph(intro),
    rows.length ? keyValues(rows) : "",
    // One primary button: the parcel tracker when there is a safe URL, else the order page.
    trackUrl
      ? button(trackUrl, t(locale, "orderShipped.track"))
      : button(data.order_url, t(locale, "common.viewOrder")),
    part(t(locale, "orderShipped.inShipment")),
    orderLines({ locale, items }),
    // textLink escapes the URL and the label.
    trackUrl ? paragraphHtml(textLink(data.order_url, t(locale, "common.viewOrder"))) : "",
    order.shipping_address ? address(locale, order.shipping_address) : "",
  ]
    .filter(Boolean)
    .join("\n")

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
