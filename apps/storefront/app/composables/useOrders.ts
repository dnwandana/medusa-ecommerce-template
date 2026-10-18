import type { HttpTypes } from "@medusajs/types"
import { errorStatus } from "~/utils/errorStatus"

// The order pages show the items, the shipping address, the delivery method, and the totals.
// The tracker reads the status fields, the fulfillments, and the payments. Each field is in the
// allowed list of the Store order route, which drops each other field with no error.
export const ORDER_FIELDS =
  "*items,*shipping_address,+item_subtotal,+shipping_total,+total,+created_at,+status,+payment_status,+fulfillment_status,*fulfillments,*shipping_methods,+payment_collections.status,*payment_collections.payment_sessions,*payment_collections.payments"

export type TrackingLabel = { tracking_number: string; tracking_url: string | null }

export type TrackingShipment = {
  id: string
  shipped_at: string
  delivered_at: string | null
  items: { line_item_id: string; title: string; quantity: number }[]
  labels: TrackingLabel[]
}

export type OrderTracking = { cancel_reason: string | null; shipments: TrackingShipment[] }

// Returns the functions that read orders from the Store API.
export function useOrders(): {
  getOrder(id: string): Promise<HttpTypes.StoreOrder | null>
  listOrders(options?: {
    limit?: number
    offset?: number
  }): Promise<{ orders: HttpTypes.StoreOrder[]; count: number }>
  getTracking(id: string): Promise<OrderTracking | null>
} {
  // The Nuxt context is not available after an await. Get the client here.
  const sdk = useMedusa()

  async function getOrder(id: string): Promise<HttpTypes.StoreOrder | null> {
    try {
      const { order } = await sdk.store.order.retrieve(id, { fields: ORDER_FIELDS })
      return order
    } catch (error) {
      if (errorStatus(error) === 404) {
        return null
      }
      throw error
    }
  }

  // The backend returns only the orders of the logged-in customer.
  async function listOrders(
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ orders: HttpTypes.StoreOrder[]; count: number }> {
    const { orders, count } = await sdk.store.order.list({
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      order: "-created_at",
      fields: ORDER_FIELDS,
    })
    return { orders, count }
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
