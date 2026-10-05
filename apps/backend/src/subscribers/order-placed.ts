import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "total",
  "shipping_total",
  "items.title",
  "items.variant_title",
  "items.quantity",
  "items.unit_price",
  "shipping_address.*",
]

// Sends the order confirmation email. An email failure must not stop the order,
// so this handler catches each error and writes it to the log.
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      filters: { id: data.id },
    })
    const order = orders[0]

    if (!order) {
      logger.warn(`The order-placed email was not sent. Order ${data.id} was not found.`)
      return
    }
    if (!order.email) {
      logger.warn(`The order-placed email was not sent. Order ${data.id} has no email address.`)
      return
    }

    const configModule = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const storefrontUrl = (configModule.admin?.storefrontUrl ?? "").replace(/\/$/, "")
    const order_url = `${storefrontUrl}/orders/${order.id}`

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      data: { order, order_url },
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The order-placed email for order ${data.id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
