import type { HttpTypes } from "@medusajs/types"
import { errorStatus } from "~/utils/errorStatus"

// The order pages show the items, the shipping address, and the totals.
export const ORDER_FIELDS = "*items,*shipping_address,+item_subtotal,+shipping_total,+total"

// Returns the functions that read orders from the Store API.
export function useOrders(): {
  getOrder(id: string): Promise<HttpTypes.StoreOrder | null>
  listOrders(options?: {
    limit?: number
    offset?: number
  }): Promise<{ orders: HttpTypes.StoreOrder[]; count: number }>
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

  return { getOrder, listOrders }
}
