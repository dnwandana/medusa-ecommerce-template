import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { ORDER_PAYMENT_FIELDS, receiptLockKey } from "../api/store/orders/[id]/receipts/route"
import { ORDER_CANCEL_REASON } from "../lib/storefront-metadata"
import { PAYMENT_RECEIPT_MODULE } from "../modules/payment-receipt"
import type PaymentReceiptModuleService from "../modules/payment-receipt/service"
import { selectExpiredOrders, timeoutWindow, type TimeoutOrder } from "./select-expired"

export const PAYMENT_TIMEOUT_REASON = "payment_timeout"

type QueriedOrder = TimeoutOrder & { metadata?: Record<string, unknown> | null }

// A workflow can throw a plain object with a message, not an Error.
function causeOf(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return String(error)
}

/**
 * Cancels the unpaid bank transfer orders with no receipt and a passed deadline. Returns the ids
 * of the cancelled orders and of the orders that the cancellation did not change. An order that
 * gets a receipt or a payment after the selection is in neither list.
 */
export async function runPaymentTimeout(
  container: MedusaContainer,
  now: Date = new Date()
): Promise<{ cancelled: string[]; failed: string[] }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { from, to } = timeoutWindow(now)

  const { data } = await query.graph({
    entity: "order",
    fields: [...ORDER_PAYMENT_FIELDS, "metadata"],
    filters: { status: { $ne: "canceled" }, created_at: { $gte: from, $lte: to } },
  })
  const orders = data as unknown as QueriedOrder[]
  if (!orders.length) {
    return { cancelled: [], failed: [] }
  }

  const receiptModule: PaymentReceiptModuleService = container.resolve(PAYMENT_RECEIPT_MODULE)
  const receipts = await receiptModule.listPaymentReceipts(
    { order_id: orders.map((o) => o.id) },
    { select: ["order_id"] }
  )
  const receiptCounts = new Map<string, number>()
  for (const { order_id } of receipts) {
    receiptCounts.set(order_id, (receiptCounts.get(order_id) ?? 0) + 1)
  }

  const orderModule = container.resolve(Modules.ORDER)
  const locking = container.resolve(Modules.LOCKING)
  const cancelled: string[] = []
  const failed: string[] = []

  for (const orderId of selectExpiredOrders(orders, receiptCounts, now)) {
    try {
      // The upload route takes the same lock. Inside the lock, the job reads the order and the
      // receipts again, because a receipt can go in after the selection.
      const done = await locking.execute(receiptLockKey(orderId), async () => {
        const {
          data: [order],
        } = await query.graph({
          entity: "order",
          fields: [...ORDER_PAYMENT_FIELDS, "metadata"],
          filters: { id: orderId },
        })
        const count = await receiptModule.countReceipts(orderId)
        const current = order as unknown as QueriedOrder | undefined
        if (!current || !selectExpiredOrders([current], new Map([[orderId, count]]), now).length) {
          return false
        }

        // The reason goes in before the cancellation, so the order.canceled subscriber can read it.
        await orderModule.updateOrders(orderId, {
          metadata: { ...(current.metadata ?? {}), [ORDER_CANCEL_REASON]: PAYMENT_TIMEOUT_REASON },
        })
        try {
          await cancelOrderWorkflow(container).run({ input: { order_id: orderId } })
        } catch (error) {
          // A failed cancellation must leave no reason. Medusa merges the metadata on an update and
          // removes a key only when its value is "". The catch below logs the error.
          await orderModule.updateOrders(orderId, { metadata: { [ORDER_CANCEL_REASON]: "" } })
          throw error
        }
        return true
      })
      if (done) {
        cancelled.push(orderId)
      }
    } catch (error) {
      // One failed order must not stop the run. The next run tries the order again.
      logger.error(`The payment timeout did not cancel order ${orderId}. Cause: ${causeOf(error)}`)
      failed.push(orderId)
    }
  }

  // The job runs each 15 minutes, so it writes no info line when it cancels nothing.
  if (cancelled.length > 0) {
    logger.info(`The payment timeout cancelled ${cancelled.length} orders.`)
  }
  return { cancelled, failed }
}
