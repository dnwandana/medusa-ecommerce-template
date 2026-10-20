import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readStoreForEmail } from "../lib/store-for-email"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { toEmailLocale } from "../email/templates/i18n"
import type { OrderShippedData, OrderShippedLabel } from "../email/templates/order-shipped"
import type { EmailLineItem } from "../email/templates/shell"

type ShipmentCreatedEvent = { id: string; no_notification?: boolean }

// The link order_fulfillment gives the fulfillment the field alias "order".
export const FULFILLMENT_FIELDS = [
  "id",
  "shipped_at",
  "labels.tracking_number",
  "labels.tracking_url",
  "items.line_item_id",
  "items.title",
  "items.quantity",
  "order.id",
  "order.display_id",
  "order.email",
  "order.locale",
  "order.shipping_address.*",
  "order.shipping_methods.name",
  "order.items.id",
  "order.items.product_title",
  "order.items.variant_title",
]

type FulfillmentItem = { line_item_id?: string | null; title: string; quantity: number }
type OrderLine = { id: string; product_title?: string | null; variant_title?: string | null }

type ShippedFulfillment = {
  id: string
  shipped_at: string | Date
  labels?: OrderShippedLabel[] | null
  items?: FulfillmentItem[] | null
  order?: {
    id: string
    display_id: number
    email?: string | null
    locale?: string | null
    shipping_address?: OrderShippedData["order"]["shipping_address"]
    shipping_methods?: { name?: string | null }[] | null
    items?: OrderLine[] | null
  } | null
}

// Returns the items of this shipment. The order line gives the product and the variant titles.
// With no matching line, the item keeps the title of the fulfillment item.
export function shipmentItems(
  items: FulfillmentItem[] | null | undefined,
  lines: OrderLine[] | null | undefined
): EmailLineItem[] {
  const lineById = new Map((lines ?? []).map((line) => [line.id, line]))
  return (items ?? []).map((item) => {
    const line = item.line_item_id ? lineById.get(item.line_item_id) : undefined
    return line
      ? {
          title: line.product_title ?? item.title,
          variant_title: line.variant_title ?? null,
          quantity: item.quantity,
        }
      : { title: item.title, variant_title: null, quantity: item.quantity }
  })
}

// Sends the "Your order is on its way" email for one shipment. An email failure must not stop
// the shipment, so this handler catches each error and writes it to the log.
export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedEvent>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    // Staff turn off the notification of the shipment in the admin.
    if (data.no_notification === true) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: FULFILLMENT_FIELDS,
      filters: { id: data.id },
    })
    const fulfillment = fulfillments[0] as unknown as ShippedFulfillment | undefined

    if (!fulfillment) {
      logger.warn(`The order-shipped email was not sent. Fulfillment ${data.id} was not found.`)
      return
    }
    const order = fulfillment.order
    if (!order) {
      logger.warn(`The order-shipped email was not sent. Fulfillment ${data.id} has no order.`)
      return
    }
    if (!order.email) {
      logger.warn(`The order-shipped email was not sent. Order ${order.id} has no email address.`)
      return
    }

    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The order-shipped email was not sent. STOREFRONT_URL has no value.")
      return
    }
    const locale = toEmailLocale(order.locale)

    const emailData: OrderShippedData = {
      locale,
      store: await readStoreForEmail(container),
      order_url: storefrontLink(storefrontUrl, locale, `/orders/${order.id}`),
      order: { display_id: order.display_id, shipping_address: order.shipping_address },
      shipment: {
        shipped_at: new Date(fulfillment.shipped_at).toISOString(),
        option_name: order.shipping_methods?.[0]?.name ?? null,
        items: shipmentItems(fulfillment.items, order.items),
        labels: fulfillment.labels ?? [],
      },
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-shipped",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The order-shipped email for fulfillment ${data.id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
