import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { confirmsPaymentLater } from "../lib/payment-confirmed-providers"
import { readPaymentWithOrder } from "../lib/payment-order"
import { readStoreForEmail } from "../lib/store-for-email"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { BANK_TRANSFER_PROVIDER_ID } from "../modules/bank-transfer/constants"
import { toEmailLocale } from "../modules/brevo/templates/i18n"
import type { PaymentConfirmedData } from "../modules/brevo/templates/payment-confirmed"

// capturePaymentWorkflow emits the event with the id of the payment.
type PaymentCapturedEvent = { id: string }

// Sends the "We received your payment" email. An email failure must not stop the capture, so
// this handler catches each error and writes it to the log.
export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentCapturedEvent>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const found = await readPaymentWithOrder(container, data.id)
    if (!found) {
      // The payment of a cart that never completed has no order.
      logger.warn(`The payment-confirmed email was not sent. Payment ${data.id} has no order.`)
      return
    }
    const { payment, order } = found

    // A gateway that captures at the redirect gets no email, because the order-placed email
    // already confirms the payment. Thus this check comes before all other checks.
    if (!confirmsPaymentLater(payment.provider_id)) {
      return
    }
    if (!order.email) {
      logger.warn(
        `The payment-confirmed email was not sent. Order ${order.id} has no email address.`
      )
      return
    }

    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The payment-confirmed email was not sent. STOREFRONT_URL has no value.")
      return
    }
    const locale = toEmailLocale(order.locale)

    const emailData: PaymentConfirmedData = {
      locale,
      store: await readStoreForEmail(container),
      order_url: storefrontLink(storefrontUrl, locale, `/orders/${order.id}`),
      payment: {
        amount: payment.amount,
        // The event comes just after the capture, so the time now is a close value.
        captured_at: payment.captured_at ?? new Date().toISOString(),
        method: payment.provider_id === BANK_TRANSFER_PROVIDER_ID ? "bank_transfer" : "other",
      },
      order: {
        display_id: order.display_id,
        created_at: order.created_at,
        first_name: order.shipping_address?.first_name ?? null,
        total: order.total,
        shipping_total: order.shipping_total,
        shipping_method: order.shipping_methods[0]?.name ?? null,
        items: order.items.map((item) => ({
          title: item.product_title ?? item.title,
          variant_title: item.variant_title,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      },
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "payment-confirmed",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The payment-confirmed email for payment ${data.id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
