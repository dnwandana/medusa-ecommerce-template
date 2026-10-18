import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const ORDER_FIELDS = [
  "id",
  "customer_id",
  "customer.first_name",
  "customer.last_name",
  "shipping_address.first_name",
  "shipping_address.last_name",
]

type NameParts = { first_name?: string | null; last_name?: string | null }

const trimmed = (value: string | null | undefined): string =>
  typeof value === "string" ? value.trim() : ""

// Copies the name of the delivery address into a customer profile that has no name. A customer
// that signs in with a magic link can have no name. The checkout already splits the full
// name at the last space, so the address holds the split name. A name that the shopper typed
// never changes. The log does not contain the name or the email.
export default async function customerNameFromOrderHandler({
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
    const order = orders[0] as
      | {
          customer_id?: string | null
          customer?: NameParts | null
          shipping_address?: NameParts | null
        }
      | undefined

    if (!order?.customer_id) {
      return
    }
    const customer = order.customer ?? {}
    if (trimmed(customer.first_name) || trimmed(customer.last_name)) {
      return
    }
    const firstName = trimmed(order.shipping_address?.first_name)
    if (!firstName) {
      return
    }
    const lastName = trimmed(order.shipping_address?.last_name)

    const customerModule = container.resolve(Modules.CUSTOMER)
    await customerModule.updateCustomers(order.customer_id, {
      first_name: firstName,
      last_name: lastName || null,
    })
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error)
    logger.error(`The customer name was not copied from order ${data.id}. Cause: ${cause}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: { subscriberId: "customer-name-from-order" },
}
