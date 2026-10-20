import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { type PaymentForEmail, readPaymentWithOrder } from "../lib/payment-order"
import { readStoreForEmail } from "../lib/store-for-email"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { BANK_TRANSFER_PROVIDER_ID } from "../modules/bank-transfer/constants"
import { toEmailLocale } from "../email/templates/i18n"
import type { RefundSentData } from "../email/templates/refund-sent"

// refundPaymentWorkflow emits the event with the id of the payment, not of the refund.
type PaymentRefundedEvent = { id: string }

type Refund = PaymentForEmail["refunds"][number]

// Returns the refund with the newest created_at. The event does not name the refund, and a
// payment can have more than one refund, so the newest refund is the refund of this event.
function newestRefund(refunds: Refund[]): Refund | undefined {
  return refunds.reduce<Refund | undefined>(
    (newest, refund) =>
      !newest || Date.parse(refund.created_at) > Date.parse(newest.created_at) ? refund : newest,
    undefined
  )
}

// Sends the "We refunded your payment" email. An email failure must not stop the refund, so
// this handler catches each error and writes it to the log.
export default async function paymentRefundedHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentRefundedEvent>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const found = await readPaymentWithOrder(container, data.id)
    if (!found) {
      logger.warn(`The refund-sent email was not sent. Payment ${data.id} has no order.`)
      return
    }
    const { payment, order } = found

    const refund = newestRefund(payment.refunds)
    if (!refund) {
      logger.warn(`The refund-sent email was not sent. Payment ${data.id} has no refund.`)
      return
    }

    const isBankTransfer = payment.provider_id === BANK_TRANSFER_PROVIDER_ID
    // The order-cancelled email of a bank transfer order already tells the customer about the
    // refund, so a second email is not necessary. A gateway refund still sends.
    if (isBankTransfer && order.status === "canceled") {
      return
    }
    if (!order.email) {
      logger.warn(`The refund-sent email was not sent. Order ${order.id} has no email address.`)
      return
    }

    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The refund-sent email was not sent. STOREFRONT_URL has no value.")
      return
    }
    const locale = toEmailLocale(order.locale)

    const emailData: RefundSentData = {
      locale,
      store: await readStoreForEmail(container),
      order_url: storefrontLink(storefrontUrl, locale, `/orders/${order.id}`),
      refund: {
        amount: refund.amount,
        created_at: refund.created_at,
        reason: refund.refund_reason?.label ?? null,
        note: refund.note,
        method: isBankTransfer ? "bank_transfer" : "other",
      },
      order: { display_id: order.display_id, created_at: order.created_at },
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "refund-sent",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The refund-sent email for payment ${data.id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
