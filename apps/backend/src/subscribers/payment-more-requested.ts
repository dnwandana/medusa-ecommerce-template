import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { listActiveBankAccounts } from "../lib/bank-accounts"
import { readStoreForEmail } from "../lib/store-for-email"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { toEmailLocale } from "../email/templates/i18n"
import type { MorePaymentNeededData } from "../email/templates/more-payment-needed"
import { PAYMENT_RECEIPT_MODULE } from "../modules/payment-receipt"
import { PAYMENT_MORE_REQUESTED } from "../modules/payment-receipt/constants"
import type PaymentReceiptModuleService from "../modules/payment-receipt/service"

// Sends the "more-payment-needed" email with the owner note to the customer. The note is already
// saved, so an email failure must not stop it. This handler catches each error and logs it.
export default async function paymentMoreRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; note_id: string }>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "locale", "shipping_address.first_name"],
      filters: { id: data.order_id },
    })
    if (!order) {
      logger.warn(
        `The more-payment-needed email was not sent. Order ${data.order_id} was not found.`
      )
      return
    }
    if (!order.email) {
      logger.warn(
        `The more-payment-needed email was not sent. Order ${data.order_id} has no email address.`
      )
      return
    }

    // The order_id filter makes sure that the note belongs to this order.
    const service: PaymentReceiptModuleService = container.resolve(PAYMENT_RECEIPT_MODULE)
    const [note] = await service.listPaymentNotes({ id: data.note_id, order_id: data.order_id })
    if (!note) {
      logger.warn(`The more-payment-needed email was not sent. Note ${data.note_id} was not found.`)
      return
    }

    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The more-payment-needed email was not sent. STOREFRONT_URL has no value.")
      return
    }

    const locale = toEmailLocale(order.locale)
    const emailData: MorePaymentNeededData = {
      locale,
      store: await readStoreForEmail(container),
      order: {
        display_id: Number(order.display_id),
        first_name: order.shipping_address?.first_name ?? null,
      },
      note: note.note,
      order_url: storefrontLink(storefrontUrl, locale, `/orders/${order.id}`),
      accounts: await listActiveBankAccounts(container),
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "more-payment-needed",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The more-payment-needed email for order ${data.order_id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: PAYMENT_MORE_REQUESTED,
}
