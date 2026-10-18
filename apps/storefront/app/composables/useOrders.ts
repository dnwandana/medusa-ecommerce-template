import type { HttpTypes } from "@medusajs/types"
import { errorStatus } from "~/utils/errorStatus"
import type { OrderPaymentState } from "~/utils/orderStatus"

// The order pages show the items, the shipping address, the delivery method, and the totals.
// The tracker reads the status fields, the fulfillments, and the collection status. Each field is
// in the allowed list of the Store order route, which drops each other field with no error.
// The fields have no payment sessions and no payments. The Store API gives the session data, with
// the payment URL and the customer object of a gateway, to each person who knows the order id.
// `payment_state` gives the payment data that the storefront needs.
export const ORDER_FIELDS =
  "*items,*shipping_address,+item_subtotal,+shipping_total,+total,+created_at,+status,+payment_status,+fulfillment_status,*fulfillments,*shipping_methods,+payment_collections.status"

// A Store order with the answer of `/store/payment-states`. The value is null when the answer has
// no entry for the order.
export type PaymentOrder = HttpTypes.StoreOrder & { payment_state: OrderPaymentState | null }

export type TrackingLabel = { tracking_number: string; tracking_url: string | null }

export type TrackingShipment = {
  id: string
  shipped_at: string
  delivered_at: string | null
  items: { line_item_id: string; title: string; quantity: number }[]
  labels: TrackingLabel[]
}

export type OrderTracking = { cancel_reason: string | null; shipments: TrackingShipment[] }

// Adds the payment state of each order.
function withPaymentStates(
  orders: HttpTypes.StoreOrder[],
  states: OrderPaymentState[]
): PaymentOrder[] {
  const byOrder = new Map(states.map((state) => [state.order_id, state]))
  return orders.map((order) => ({ ...order, payment_state: byOrder.get(order.id) ?? null }))
}

// Returns the functions that read orders from the Store API.
export function useOrders(): {
  getOrder(id: string): Promise<PaymentOrder | null>
  listOrders(options?: {
    limit?: number
    offset?: number
  }): Promise<{ orders: PaymentOrder[]; count: number }>
  getTracking(id: string): Promise<OrderTracking | null>
} {
  // The Nuxt context is not available after an await. Get the client here.
  const sdk = useMedusa()
  const { getPaymentStates } = useReceipts()

  // The two requests run at the same time. A 404 of the order gives null, also when the payment
  // state request fails.
  async function getOrder(id: string): Promise<PaymentOrder | null> {
    const [orderResult, statesResult] = await Promise.allSettled([
      sdk.store.order.retrieve(id, { fields: ORDER_FIELDS }),
      getPaymentStates([id]),
    ])
    if (orderResult.status === "rejected") {
      if (errorStatus(orderResult.reason) === 404) {
        return null
      }
      throw orderResult.reason
    }
    if (statesResult.status === "rejected") {
      throw statesResult.reason
    }
    return withPaymentStates([orderResult.value.order], statesResult.value)[0]!
  }

  // The backend returns only the orders of the logged-in customer. One payment state request
  // covers the page.
  async function listOrders(
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ orders: PaymentOrder[]; count: number }> {
    const { orders, count } = await sdk.store.order.list({
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      order: "-created_at",
      fields: ORDER_FIELDS,
    })
    const states = await getPaymentStates(orders.map((order) => order.id))
    return { orders: withPaymentStates(orders, states), count }
  }

  // The Store order route does not return the labels, the fulfillment items, or the order
  // metadata. A custom route returns them.
  async function getTracking(id: string): Promise<OrderTracking | null> {
    try {
      return await sdk.client.fetch<OrderTracking>(`/store/orders/${id}/tracking`)
    } catch (error) {
      if (errorStatus(error) === 404) {
        return null
      }
      throw error
    }
  }

  return { getOrder, listOrders, getTracking }
}
