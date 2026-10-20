import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { adminLink } from "../lib/admin-url"
import { listActiveBankAccounts } from "../lib/bank-accounts"
import { readOwnerEmail } from "../lib/owner-email"
import { readStoreForEmail } from "../lib/store-for-email"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { BANK_TRANSFER_PROVIDER_ID, PAYMENT_DEADLINE_MS } from "../modules/bank-transfer/constants"
import { formatWibTime } from "../email/templates/html"
import { toEmailLocale } from "../email/templates/i18n"
import type { NewOrderOwnerData } from "../email/templates/new-order-owner"
import type { OrderPlacedData } from "../email/templates/order-placed"
import type { EmailAddress, EmailLineItem } from "../email/templates/shell"

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "locale",
  "created_at",
  "total",
  "shipping_total",
  "shipping_methods.name",
  "items.title",
  "items.product_title",
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

type Logger = { warn: (message: string) => void; error: (message: string) => void }

type PlacedOrder = {
  id: string
  display_id: number | string
  email?: string | null
  locale?: string | null
  created_at: string | Date
  total: number | string
  shipping_total: number | string
  shipping_methods?: { name?: string | null }[] | null
  items?:
    | {
        title?: string | null
        product_title?: string | null
        variant_title?: string | null
        quantity?: number | null
        unit_price?: number | null
      }[]
    | null
  shipping_address?: EmailAddress | null
  payment_collections?: PaymentCollection[] | null
}

// The collection statuses after a capture of all or part of the amount.
const CAPTURED_STATUSES = new Set(["completed", "partially_captured"])

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

// Returns true for a bank transfer order that the admin already captured. Such an order needs no
// receipt, so the owner alert gives no "waiting" label.
function isCapturedBankTransfer(collections: PaymentCollection[] | null | undefined): boolean {
  return (collections ?? []).some(
    (collection) =>
      CAPTURED_STATUSES.has(collection?.status ?? "") &&
      (collection.payment_sessions ?? []).some(
        (session) => session?.provider_id === BANK_TRANSFER_PROVIDER_ID
      )
  )
}

// Returns the payment label of the owner alert. The template puts "waiting for the receipt" in
// the subject only when waiting_for_receipt is true.
function ownerPayment(
  collections: PaymentCollection[] | null | undefined
): NewOrderOwnerData["payment"] {
  if (isUnpaidBankTransfer(collections)) {
    return { label: "Bank transfer, waiting for the receipt", waiting_for_receipt: true }
  }
  if (isCapturedBankTransfer(collections)) {
    return { label: "Bank transfer", waiting_for_receipt: false }
  }
  return { label: "Online payment", waiting_for_receipt: false }
}

// Returns the name of the delivery address, or null. A customer that signs in with a magic link
// can have no profile name, so the address is the only name source at checkout.
function customerName(address: EmailAddress | null | undefined): string | null {
  const name = [address?.first_name, address?.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ")
  return name || null
}

// Both emails show the same lines. The product title is the main title, because the item title
// can be only the variant name.
function emailItems(order: PlacedOrder): EmailLineItem[] {
  return (order.items ?? []).map((item) => ({
    title: item?.product_title ?? (item?.title as string),
    variant_title: item?.variant_title,
    quantity: item?.quantity as number,
    unit_price: item?.unit_price as number,
  }))
}

// Sends the order confirmation email to the customer.
async function sendCustomerEmail(
  container: MedusaContainer,
  logger: Logger,
  order: PlacedOrder
): Promise<void> {
  try {
    if (!order.email) {
      logger.warn(`The order-placed email was not sent. Order ${order.id} has no email address.`)
      return
    }

    const storefrontUrl = readStorefrontUrl(container)
    if (!storefrontUrl) {
      logger.warn("The order-placed email was not sent. STOREFRONT_URL has no value.")
      return
    }

    const locale = toEmailLocale(order.locale)
    const createdAt = new Date(order.created_at as string | Date)
    const emailData: OrderPlacedData = {
      locale,
      store: await readStoreForEmail(container),
      order_url: storefrontLink(storefrontUrl, locale, `/orders/${order.id}`),
      order: {
        display_id: Number(order.display_id),
        email: order.email,
        created_at: createdAt.toISOString(),
        total: Number(order.total),
        shipping_total: Number(order.shipping_total),
        shipping_method: order.shipping_methods?.[0]?.name ?? null,
        items: emailItems(order),
        shipping_address: order.shipping_address,
      },
    }

    // A gateway order gets no bank_transfer key, so its email shows no bank details.
    if (isUnpaidBankTransfer(order.payment_collections as PaymentCollection[])) {
      emailData.bank_transfer = {
        amount: Number(order.total),
        deadline: formatWibTime(new Date(createdAt.getTime() + PAYMENT_DEADLINE_MS), locale),
        accounts: await listActiveBankAccounts(container),
      }
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The order-placed email for order ${order.id} failed. Cause: ${cause}`)
  }
}

// Sends the new order alert to the store owner. The alert needs no storefront link and no
// customer address, so a problem with the customer email does not stop it.
async function sendOwnerEmail(
  container: MedusaContainer,
  logger: Logger,
  order: PlacedOrder
): Promise<void> {
  try {
    // The same address as the receipt-uploaded email.
    const to = await readOwnerEmail(container)
    if (!to) {
      logger.warn(
        `The owner email is empty. The new-order-owner email for order #${order.display_id} was not sent. Set the store contact email or STORE_OWNER_EMAIL.`
      )
      return
    }

    const emailData: NewOrderOwnerData = {
      store: await readStoreForEmail(container),
      admin_url: adminLink(container, `/orders/${order.id}`),
      payment: ownerPayment(order.payment_collections as PaymentCollection[]),
      order: {
        display_id: Number(order.display_id),
        created_at: new Date(order.created_at as string | Date).toISOString(),
        // The owner still gets the alert for an order with no email address.
        email: order.email ?? "",
        customer_name: customerName(order.shipping_address),
        total: Number(order.total),
        shipping_total: Number(order.shipping_total),
        shipping_method: order.shipping_methods?.[0]?.name ?? null,
        items: emailItems(order),
        shipping_address: order.shipping_address,
      },
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to,
      channel: "email",
      template: "new-order-owner",
      data: emailData,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The new-order-owner email for order ${order.id} failed. Cause: ${cause}`)
  }
}

// Sends the order confirmation email and the owner alert. An email failure must not stop the
// order, so this handler catches each error and writes it to the log. Each email has its own
// catch, so a failure of one email does not stop the other.
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let order: PlacedOrder | undefined
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ORDER_FIELDS,
      filters: { id: data.id },
    })
    order = orders[0] as PlacedOrder | undefined
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(
      `The order-placed and new-order-owner emails for order ${data.id} were not sent. Cause: ${cause}`
    )
    return
  }

  if (!order) {
    logger.warn(`The order-placed email was not sent. Order ${data.id} was not found.`)
    return
  }

  await sendCustomerEmail(container, logger, order)
  await sendOwnerEmail(container, logger, order)
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
