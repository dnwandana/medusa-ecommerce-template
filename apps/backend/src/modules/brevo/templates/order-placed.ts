import { escapeHtml, formatRupiah, layout, RenderedEmail } from "./html"

export type OrderPlacedItem = {
  title: string
  variant_title?: string | null
  quantity: number
  unit_price: number
}

export type OrderPlacedAddress = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  city?: string | null
  postal_code?: string | null
  phone?: string | null
}

export type OrderPlacedData = {
  order_url: string
  order: {
    display_id: number
    email: string
    total: number
    shipping_total: number
    items: OrderPlacedItem[]
    shipping_address?: OrderPlacedAddress | null
  }
}

const cell = "padding:8px 0;border-bottom:1px solid #eee;"

function renderItem(item: OrderPlacedItem): string {
  const variant = item.variant_title ? ` (${escapeHtml(item.variant_title)})` : ""
  const label = `${escapeHtml(item.quantity)} × ${escapeHtml(item.title)}${variant}`
  const lineTotal = formatRupiah(Number(item.unit_price) * Number(item.quantity))
  return `<tr><td style="${cell}">${label}</td><td style="${cell}text-align:right;">${escapeHtml(lineTotal)}</td></tr>`
}

function renderAddress(address: OrderPlacedAddress): string {
  const name = [address.first_name, address.last_name].filter(Boolean).join(" ")
  const cityLine = [address.city, address.postal_code].filter(Boolean).join(" ")
  const lines = [name, address.address_1, cityLine, address.phone]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
  return `<h2>Ship to</h2>\n<p>${lines.join("<br>")}</p>`
}

// Returns the order confirmation email for the customer.
export function renderOrderPlaced(data: OrderPlacedData): RenderedEmail {
  const order = data?.order
  if (!order) {
    throw new Error('The "order-placed" template needs an order.')
  }

  const title = `Order #${order.display_id} confirmed`
  const items = (order.items ?? []).map(renderItem).join("\n")

  const body = [
    "<p>Thank you for your order. We received it and will prepare it for shipping.</p>",
    `<table style="width:100%;border-collapse:collapse;">\n${items}\n</table>`,
    `<p>${escapeHtml(`Shipping: ${formatRupiah(order.shipping_total)}`)}<br>`,
    `<strong>${escapeHtml(`Total: ${formatRupiah(order.total)}`)}</strong></p>`,
    order.shipping_address ? renderAddress(order.shipping_address) : "",
    `<p><a href="${escapeHtml(data.order_url)}">View your order</a></p>`,
  ]
    .filter(Boolean)
    .join("\n")

  return { subject: title, html: layout(title, body) }
}
