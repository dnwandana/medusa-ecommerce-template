import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createOrderFulfillmentWorkflow,
  createOrderShipmentWorkflow,
} from "@medusajs/medusa/core-flows"

export type PlacedItem = {
  id: string
  sku: string
  product_id: string
  quantity: number
  shipped_quantity: number
}

// Returns the line items of an order with the shipped quantity of each item.
export async function getOrderItems(
  container: MedusaContainer,
  orderId: string
): Promise<PlacedItem[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    filters: { id: orderId },
    fields: [
      "id",
      "items.id",
      "items.variant_sku",
      "items.product_id",
      "items.quantity",
      "items.detail.shipped_quantity",
    ],
  })
  const order = data[0]
  if (!order) {
    throw new Error(`The order ${orderId} does not exist.`)
  }
  return (order.items ?? []).flatMap((item) => (item ? [item] : [])).map((item) => ({
    id: item.id,
    sku: item.variant_sku ?? "",
    product_id: item.product_id ?? "",
    quantity: Number(item.quantity),
    shipped_quantity: Number(item.detail?.shipped_quantity ?? 0),
  }))
}

// Creates one fulfillment for the given items and marks it as shipped.
export async function shipOrderItems(
  container: MedusaContainer,
  orderId: string,
  items: { id: string; quantity: number }[]
): Promise<void> {
  const { result: fulfillment } = await createOrderFulfillmentWorkflow(container).run({
    input: { order_id: orderId, items },
  })
  await createOrderShipmentWorkflow(container).run({
    input: {
      order_id: orderId,
      fulfillment_id: fulfillment.id,
      items,
      labels: [{ tracking_number: "TEST-1", tracking_url: "#", label_url: "#" }],
    },
  })
}
