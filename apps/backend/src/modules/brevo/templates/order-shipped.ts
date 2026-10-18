import { emailButton, escapeHtml, layout, RenderedEmail } from "./html"
import { OrderPlacedAddress, renderAddress } from "./order-placed"

export type OrderShippedItem = { title: string; variant_title?: string | null; quantity: number }

export type OrderShippedLabel = { tracking_number: string; tracking_url?: string | null }

export type OrderShippedData = {
  order_url: string
  order: { display_id: number; shipping_address?: OrderPlacedAddress | null }
  shipment: {
    // ISO time of the shipment.
    shipped_at: string
    option_name?: string | null
    items: OrderShippedItem[]
    labels: OrderShippedLabel[]
  }
}

const WIB_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
})

// Formats a date in WIB, for example "20 October 2026". It builds the text from the parts, as
// formatWibTime does, because the words that join the parts differ between ICU versions.
function formatWibDate(date: Date): string {
  const parts: Record<string, string> = {}
  for (const part of WIB_DATE_FORMAT.formatToParts(date)) {
    parts[part.type] = part.value
  }
  return `${parts.day} ${parts.month} ${parts.year}`
}

// Staff type the tracking URL. Only an https URL goes into a link, so a "javascript:" or an
// "http:" URL never reaches an href.
function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

function renderTracking(labels: OrderShippedLabel[]): string {
  const parts = (labels ?? [])
    .filter((label) => label?.tracking_number?.trim())
    .map((label) => {
      const number = `<p>${escapeHtml(`Tracking number: ${label.tracking_number.trim()}`)}</p>`
      return isHttpsUrl(label.tracking_url)
        ? `${number}\n${emailButton(label.tracking_url, "Track your parcel")}`
        : number
    })
  return parts.length ? ["<h2>Tracking</h2>", ...parts].join("\n") : ""
}

function renderItem(item: OrderShippedItem): string {
  const variant = item.variant_title ? ` (${escapeHtml(item.variant_title)})` : ""
  return `${escapeHtml(item.quantity)} × ${escapeHtml(item.title)}${variant}`
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

  const title = `Your order #${order.display_id} is on its way`
  const date = formatWibDate(new Date(shipment.shipped_at))
  const firstLine = shipment.option_name
    ? `We shipped your order on ${date} with ${shipment.option_name}.`
    : `We shipped your order on ${date}.`
  const items = (shipment.items ?? []).map(renderItem).join("<br>")

  const body = [
    `<p>${escapeHtml(firstLine)}</p>`,
    renderTracking(shipment.labels),
    "<h2>In this shipment</h2>",
    `<p>${items}</p>`,
    order.shipping_address ? renderAddress(order.shipping_address) : "",
    `<p><a href="${escapeHtml(data.order_url)}">View your order</a></p>`,
  ]
    .filter(Boolean)
    .join("\n")

  return { subject: title, html: layout(title, body) }
}
