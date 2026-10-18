import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PAYMENT_RECEIPT_MODULE } from "../modules/payment-receipt"
import { PAYMENT_RECEIPT_UPLOADED } from "../modules/payment-receipt/constants"
import type PaymentReceiptModuleService from "../modules/payment-receipt/service"

// The same defaults as the password reset email.
const DEFAULT_BACKEND_URL = "http://localhost:9000"
const DEFAULT_ADMIN_PATH = "/app"

// Sends the "receipt-uploaded" email to the store owner. The upload is already saved, so an email
// failure must not stop it. This handler catches each error and writes it to the log.
export default async function paymentReceiptUploadedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "display_id"],
      filters: { id: data.order_id },
    })
    if (!order) {
      logger.warn(`The receipt-uploaded email was not sent. Order ${data.order_id} was not found.`)
      return
    }

    // The same env value as the paid cart alert of src/recovery/dependencies.ts.
    const to = process.env.STORE_OWNER_EMAIL ?? ""
    if (!to) {
      logger.warn(
        `STORE_OWNER_EMAIL is empty. The receipt email for order #${order.display_id} was not sent.`
      )
      return
    }

    const service: PaymentReceiptModuleService = container.resolve(PAYMENT_RECEIPT_MODULE)
    const [[receipt], receiptCount] = await Promise.all([
      service.listPaymentReceipts({ id: data.id }),
      service.countReceipts(data.order_id),
    ])
    if (!receipt) {
      logger.warn(`The receipt-uploaded email was not sent. Receipt ${data.id} was not found.`)
      return
    }

    const configModule = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    const admin = configModule.admin ?? {}
    // The Medusa default for backendUrl is "/", and an email needs a full URL.
    const backendUrl =
      !admin.backendUrl || admin.backendUrl === "/"
        ? DEFAULT_BACKEND_URL
        : admin.backendUrl.replace(/\/$/, "")

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to,
      channel: "email",
      template: "receipt-uploaded",
      data: {
        order: { display_id: order.display_id },
        file_name: receipt.file_name,
        receipt_count: receiptCount,
        admin_url: `${backendUrl}${admin.path ?? DEFAULT_ADMIN_PATH}/orders/${order.id}`,
      },
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The receipt-uploaded email for order ${data.order_id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: PAYMENT_RECEIPT_UPLOADED,
}
