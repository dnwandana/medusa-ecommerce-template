import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readStoreForEmail } from "../lib/store-for-email"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { toEmailLocale } from "../email/templates/i18n"
import type { OrderDeliveredData } from "../email/templates/order-delivered"
import { FULFILLMENT_FIELDS, shipmentItems } from "./shipment-created"

// markOrderFulfillmentAsDeliveredWorkflow emits the fulfillment id and the no_notification flag
// of its input.
type DeliveryCreatedEvent = { id: string; no_notification?: boolean }

// The fields of the shipment email give the items and the order. delivered_at gives the date.
const DELIVERY_FIELDS = [...FULFILLMENT_FIELDS, "delivered_at"]

type DeliveredFulfillment = {
  id: string
  delivered_at?: string | Date | null
  items?: Parameters<typeof shipmentItems>[0]
  order?: {
    id: string
    display_id: number
    email?: string | null
    locale?: string | null
    items?: Parameters<typeof shipmentItems>[1]
  } | null
}

// Sends the "Your order is delivered" email for one fulfillment. An email failure must not stop
// the delivery, so this handler catches each error and writes it to the log.
export default async function deliveryCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<DeliveryCreatedEvent>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    // Staff turn off the notification of the delivery in the admin.
    if (data.no_notification === true) {
      return
    }

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: DELIVERY_FIELDS,
      filters: { id: data.id },
    })
    const fulfillment = fulfillments[0] as unknown as DeliveredFulfillment | undefined

    if (!fulfillment) {
      logger.warn(`The order-delivered email was not sent. Fulfillment ${data.id} was not found.`)
      return
    }
    const order = fulfillment.order
    if (!order) {
      logger.warn(`The order-delivered email was not sent. Fulfillment ${data.id} has no order.`)
      return
    }
    if (!order.email) {
      logger.warn(`The order-delivered email was not sent. Order ${order.id} has no email address.`)
      return
    }

    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The order-delivered email was not sent. STOREFRONT_URL has no value.")
      return
    }
    const locale = toEmailLocale(order.locale)

    const emailData: OrderDeliveredData = {
      locale,
      store: await readStoreForEmail(container),
      order_url: storefrontLink(storefrontUrl, locale, `/orders/${order.id}`),
      order: { display_id: order.display_id },
      delivery: {
        // The workflow sets delivered_at before the event. The current time is only a fallback.
        delivered_at: new Date(fulfillment.delivered_at ?? Date.now()).toISOString(),
        items: shipmentItems(fulfillment.items, order.items),
      },
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-delivered",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The order-delivered email for fulfillment ${data.id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
