import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BANK_ACCOUNT_MODULE } from "../modules/bank-account"
import type BankAccountModuleService from "../modules/bank-account/service"
import { BANK_TRANSFER_PROVIDER_ID, PAYMENT_DEADLINE_MS } from "../modules/bank-transfer/constants"
import { formatWibTime } from "../modules/brevo/templates/html"
import type { OrderPlacedBankTransfer } from "../modules/brevo/templates/order-placed"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "created_at",
  "total",
  "shipping_total",
  "items.title",
  "items.variant_title",
  "items.quantity",
  "items.unit_price",
  "shipping_address.*",
  "payment_collections.status",
  "payment_collections.payment_sessions.provider_id",
]

type PaymentCollection = {
  status?: string | null
  payment_sessions?: { provider_id?: string | null }[] | null
}

// Returns true for a bank transfer order that is not paid. The bank transfer provider authorizes
// at once, so such an order has an authorized collection with a bank transfer session. A
// captured collection has a different status and gets no bank details.
function isUnpaidBankTransfer(collections: PaymentCollection[] | null | undefined): boolean {
  return (collections ?? []).some(
    (collection) =>
      collection?.status === "authorized" &&
      (collection.payment_sessions ?? []).some(
        (session) => session?.provider_id === BANK_TRANSFER_PROVIDER_ID
      )
  )
}

// Returns the bank details for the email. The email shows only the public account fields.
async function bankTransferDetails(
  container: MedusaContainer,
  order: { total: unknown; created_at: unknown }
): Promise<OrderPlacedBankTransfer> {
  const service: BankAccountModuleService = container.resolve(BANK_ACCOUNT_MODULE)
  const accounts = await service.listBankAccounts(
    { is_active: true },
    { order: { rank: "ASC", created_at: "ASC" } }
  )
  const createdAt = new Date(order.created_at as string | Date).getTime()

  return {
    amount: Number(order.total),
    deadline: formatWibTime(new Date(createdAt + PAYMENT_DEADLINE_MS)),
    accounts: accounts.map((account) => ({
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_holder: account.account_holder,
    })),
  }
}

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

    // A gateway order gets no bank_transfer key, so its email shows no bank details.
    const emailData = isUnpaidBankTransfer(order.payment_collections as PaymentCollection[])
      ? { order, order_url, bank_transfer: await bankTransferDetails(container, order) }
      : { order, order_url }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The order-placed email for order ${data.id} failed. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
