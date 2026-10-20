import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { readStoreForEmail } from "../lib/store-for-email"
import { ORDER_REVIEW_REQUEST_SENT_AT } from "../lib/storefront-metadata"
import { readStorefrontUrl, storefrontLink } from "../lib/storefront-url"
import { toEmailLocale } from "../modules/brevo/templates/i18n"
import type { ReviewRequestData } from "../modules/brevo/templates/review-request"
import type { EmailStore } from "../modules/brevo/templates/shell"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import {
  listReviewableItems,
  type OrderForReview,
  type OrderItemForReview,
  REVIEW_ORDER_FIELDS,
} from "../modules/product-review/reviewable"
import type ProductReviewModuleService from "../modules/product-review/service"
import { type DeliveredOrder, reviewWindow, selectDueOrders } from "./select"

const TEMPLATE = "review-request"

// The selection reads only the fields of the rules, because it reads many orders.
const SELECT_FIELDS = ["id", "status", "metadata", "fulfillments.delivered_at"]

// The full read of one order adds the fields of the email.
const ORDER_FIELDS = [
  ...REVIEW_ORDER_FIELDS,
  "items.title",
  "status",
  "email",
  "locale",
  "metadata",
  "shipping_address.first_name",
  "fulfillments.delivered_at",
]

type ReviewRequestOrder = DeliveredOrder &
  Omit<OrderForReview, "items"> & {
    email?: string | null
    locale?: string | null
    shipping_address?: { first_name?: string | null } | null
    items?: ((OrderItemForReview & { title?: string | null }) | null)[] | null
  }

type Outcome = "sent" | "skipped" | "none"

// A failed step can throw a plain object with a message, not an Error.
function causeOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return String(error)
}

/** Returns the lock key of the review request of one order. */
export function reviewRequestKey(orderId: string): string {
  return `review-request:${orderId}`
}

/**
 * Sends the review request for each order with a delivery 7 days ago or more. Returns the ids of
 * the orders that got the email, the ids of the orders with nothing to send, and the ids of the
 * failed orders. An order in sent or skipped has the mark, so no later run selects it again.
 */
export async function runReviewRequests(
  container: MedusaContainer,
  now: Date = new Date()
): Promise<{ sent: string[]; skipped: string[]; failed: string[] }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const sent: string[] = []
  const skipped: string[] = []
  const failed: string[] = []
  const { from, to } = reviewWindow(now)

  // Medusa 2.21 Query changes the filter on the linked fulfillments to an EXISTS subquery. The
  // filter thus limits the orders, but each order keeps all its fulfillments. selectDueOrders
  // checks the delivery again and also does the rules that the database cannot do: the mark in
  // the metadata, the sort, and the limit.
  const { data } = await query.graph({
    entity: "order",
    fields: SELECT_FIELDS,
    // The Query filter type has only the fields of the order module, not the linked fields.
    filters: {
      status: { $ne: "canceled" },
      fulfillments: { delivered_at: { $gte: from, $lte: to } },
    } as Record<string, unknown>,
  })
  const due = selectDueOrders(data as unknown as DeliveredOrder[], now)
  if (!due.length) {
    return { sent, skipped, failed }
  }

  // With no storefront URL the email has no link. The job writes no mark, so a later run sends
  // the requests when the URL has a value.
  const storefrontUrl = readStorefrontUrl(container)
  if (!storefrontUrl) {
    logger.warn("The review requests were not sent. STOREFRONT_URL has no value.")
    return { sent, skipped, failed }
  }

  const orderModule = container.resolve(Modules.ORDER)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const locking = container.resolve(Modules.LOCKING)
  const reviewService: ProductReviewModuleService = container.resolve(PRODUCT_REVIEW_MODULE)
  let store: EmailStore | undefined

  // Medusa merges the metadata on an update, so the mark alone keeps the other keys.
  const writeMark = (orderId: string) =>
    orderModule.updateOrders(orderId, {
      metadata: { [ORDER_REVIEW_REQUEST_SENT_AT]: now.toISOString() },
    })

  for (const orderId of due) {
    try {
      // The lock stops two runs at the same time from sending two requests for one order. Inside
      // the lock, the job reads the order again, because the other run can write the mark first.
      const outcome = await locking.execute(
        reviewRequestKey(orderId),
        async (): Promise<Outcome> => {
          const {
            data: [raw],
          } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id: orderId } })
          const order = raw as unknown as ReviewRequestOrder | undefined
          if (!order || !selectDueOrders([order], now).length) {
            return "none"
          }

          // The mark goes in, so the job does not read this order each day.
          if (!order.email) {
            logger.warn(
              `The review request for order ${orderId} was not sent. The order has no email address.`
            )
            await writeMark(orderId)
            return "skipped"
          }

          // A review of any status counts, so a customer with a rejected review gets no request.
          const lineItemIds = (order.items ?? []).flatMap((item) => (item ? [item.id] : []))
          const reviews = lineItemIds.length
            ? await reviewService.listReviews(
                { order_line_item_id: lineItemIds },
                { select: ["order_line_item_id"] }
              )
            : []
          const items = listReviewableItems(
            [order],
            reviews.map((review) => review.order_line_item_id)
          )
          if (!items.length) {
            await writeMark(orderId)
            return "skipped"
          }

          // The line item title is the fallback for an item with no product title.
          const titleById = new Map(
            (order.items ?? []).flatMap((item) => (item ? [[item.id, item.title ?? ""]] : []))
          )
          const locale = toEmailLocale(order.locale)
          store ??= await readStoreForEmail(container)
          const emailData: ReviewRequestData = {
            locale,
            store,
            review_url: storefrontLink(storefrontUrl, locale, "/account/orders"),
            first_name: order.shipping_address?.first_name ?? null,
            order: { display_id: order.display_id },
            products: items.map((item) => ({
              title: item.product_title ?? titleById.get(item.order_line_item_id) ?? "",
              variant_title: item.variant_title,
              thumbnail: item.thumbnail,
            })),
          }

          // The mark goes in before the send, so one order never gets two requests. The send has no
          // idempotency key: Medusa 2.21.2 sends a key with a failed row again but then throws on
          // the update of that row, so the job would send the email again each day.
          await writeMark(orderId)
          try {
            await notificationService.createNotifications({
              to: order.email,
              channel: "email",
              template: TEMPLATE,
              data: emailData,
            })
          } catch (error) {
            // Medusa removes a metadata key only with the value "". The next run tries again.
            await orderModule.updateOrders(orderId, {
              metadata: { [ORDER_REVIEW_REQUEST_SENT_AT]: "" },
            })
            throw error
          }
          return "sent"
        }
      )
      if (outcome === "sent") {
        sent.push(orderId)
      } else if (outcome === "skipped") {
        skipped.push(orderId)
      }
    } catch (error) {
      // One failed order must not stop the run. The order has no mark, so the next run tries again.
      // When the removal of the mark also fails, the order gets no request.
      logger.error(`The review request for order ${orderId} failed. Cause: ${causeOf(error)}`)
      failed.push(orderId)
    }
  }

  if (sent.length > 0) {
    logger.info(`The review requests job sent ${sent.length} emails.`)
  }
  return { sent, skipped, failed }
}
