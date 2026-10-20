import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readStoreForEmail } from "../lib/store-for-email"
import { ORDER_CANCEL_NOTE, ORDER_CANCEL_REASON } from "../lib/storefront-metadata"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { BANK_TRANSFER_PROVIDER_ID } from "../modules/bank-transfer/constants"
import { toEmailLocale } from "../email/templates/i18n"
import type { OrderCancelledData } from "../email/templates/order-cancelled"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "locale",
  "created_at",
  "total",
  "shipping_total",
  "metadata",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.quantity",
  "items.unit_price",
  "shipping_methods.name",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.amount",
]

type Payment = {
  provider_id?: string | null
  captured_at?: string | Date | null
  amount?: unknown
}

type PaymentCollection = { payments?: (Payment | null)[] | null }

// Returns the refund that the email promises: the first captured payment of the order, or null
// when nothing was captured.
function capturedRefund(
  collections: (PaymentCollection | null)[] | null | undefined
): OrderCancelledData["refund"] {
  const payment = (collections ?? [])
    .flatMap((collection) => collection?.payments ?? [])
    .find((item) => Boolean(item?.captured_at))
  if (!payment) {
    return null
  }
  return {
    amount: Number(payment.amount),
    method: payment.provider_id === BANK_TRANSFER_PROVIDER_ID ? "bank_transfer" : "gateway",
  }
}

// Returns the staff note. The cancel route and the timeout job write "" to remove the key,
// because Medusa merges the metadata. Thus an empty or a whitespace note counts as no note.
function cancelNote(metadata: Record<string, unknown> | null | undefined): string | null {
  const note = metadata?.[ORDER_CANCEL_NOTE]
  return typeof note === "string" && note.trim() ? note.trim() : null
}

// Sends the "Your order is cancelled" email. An email failure must not stop the cancel,
// so this handler catches each error and writes it to the log.
export default async function orderCancelledHandler({
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
      logger.warn(`The order-cancelled email was not sent. Order ${data.id} was not found.`)
      return
    }
    if (!order.email) {
      logger.warn(`The order-cancelled email was not sent. Order ${data.id} has no email address.`)
      return
    }

    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The order-cancelled email was not sent. STOREFRONT_URL has no value.")
      return
    }

    const locale = toEmailLocale(order.locale)
    const metadata = order.metadata as Record<string, unknown> | null | undefined
    // Only the timeout job writes "payment_timeout". All other cancels come from the staff.
    const reason =
      metadata?.[ORDER_CANCEL_REASON] === "payment_timeout" ? "payment_timeout" : "staff"

    const emailData: OrderCancelledData = {
      locale,
      store: await readStoreForEmail(container),
      // The English home link has no path, so the link has no trailing slash.
      shop_url: storefrontLink(storefrontUrl, locale, "/").replace(/\/+$/, ""),
      reason,
      note: cancelNote(metadata),
      refund: capturedRefund(order.payment_collections as (PaymentCollection | null)[]),
      order: {
        display_id: Number(order.display_id),
        created_at: new Date(order.created_at as string | Date).toISOString(),
        total: Number(order.total),
        shipping_total: Number(order.shipping_total),
        shipping_method: order.shipping_methods?.[0]?.name ?? null,
        items: (order.items ?? []).map((item) => ({
          title: item?.product_title ?? (item?.title as string),
          variant_title: item?.variant_title,
          quantity: item?.quantity as number,
          unit_price: item?.unit_price as number,
        })),
      },
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-cancelled",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The order-cancelled email for order ${data.id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
