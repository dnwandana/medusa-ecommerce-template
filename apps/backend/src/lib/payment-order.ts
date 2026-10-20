import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { EmailAddress } from "../modules/brevo/templates/shell"

export type PaymentForEmail = {
  id: string
  provider_id: string
  amount: number
  captured_at: string | null
  refunds: {
    id: string
    amount: number
    created_at: string
    note: string | null
    refund_reason: { label: string } | null
  }[]
}

export type OrderForPaymentEmail = {
  id: string
  display_id: number
  email: string | null
  locale: string | null
  status: string
  created_at: string
  total: number
  shipping_total: number
  shipping_methods: { name: string | null }[]
  items: {
    product_title: string | null
    title: string
    variant_title: string | null
    quantity: number
    unit_price: number
  }[]
  shipping_address: EmailAddress | null
}

// The payment module links the payment to its collection. The link order_payment_collection gives
// the collection the field alias "order".
export const PAYMENT_ORDER_FIELDS = [
  "id",
  "provider_id",
  "amount",
  "captured_at",
  "refunds.id",
  "refunds.amount",
  "refunds.created_at",
  "refunds.note",
  "refunds.refund_reason.label",
  "payment_collection.order.id",
  "payment_collection.order.display_id",
  "payment_collection.order.email",
  "payment_collection.order.locale",
  "payment_collection.order.status",
  "payment_collection.order.created_at",
  "payment_collection.order.total",
  "payment_collection.order.shipping_total",
  "payment_collection.order.shipping_methods.name",
  "payment_collection.order.items.product_title",
  "payment_collection.order.items.title",
  "payment_collection.order.items.variant_title",
  "payment_collection.order.items.quantity",
  "payment_collection.order.items.unit_price",
  "payment_collection.order.shipping_address.*",
]

type DateValue = string | Date

type QueriedRefund = {
  id: string
  amount: unknown
  created_at: DateValue
  note?: string | null
  refund_reason?: { label: string } | null
}

type QueriedOrder = Omit<
  OrderForPaymentEmail,
  "created_at" | "total" | "shipping_total" | "items" | "shipping_methods"
> & {
  created_at: DateValue
  total: unknown
  shipping_total: unknown
  shipping_methods?: { name?: string | null }[] | null
  items?: (Omit<OrderForPaymentEmail["items"][number], "unit_price"> & { unit_price: unknown })[]
}

type QueriedPayment = {
  id: string
  provider_id: string
  amount: unknown
  captured_at?: DateValue | null
  refunds?: QueriedRefund[] | null
  payment_collection?: { order?: QueriedOrder | null } | null
}

// Query gives a Date for a date field and can give a BigNumber for an amount. The email code
// reads plain strings and numbers.
const toIso = (value: DateValue): string => new Date(value).toISOString()

/**
 * Returns the payment and its order for a payment email. Returns null when the payment or its
 * order does not exist, for example for the payment of a cart that never completed.
 */
export async function readPaymentWithOrder(
  scope: MedusaContainer,
  paymentId: string
): Promise<{ payment: PaymentForEmail; order: OrderForPaymentEmail } | null> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [row],
  } = await query.graph({
    entity: "payment",
    fields: PAYMENT_ORDER_FIELDS,
    filters: { id: paymentId },
  })
  const queried = row as unknown as QueriedPayment | undefined
  const order = queried?.payment_collection?.order
  if (!queried || !order) {
    return null
  }

  return {
    payment: {
      id: queried.id,
      provider_id: queried.provider_id,
      amount: Number(queried.amount),
      captured_at: queried.captured_at ? toIso(queried.captured_at) : null,
      refunds: (queried.refunds ?? []).map((refund) => ({
        id: refund.id,
        amount: Number(refund.amount),
        created_at: toIso(refund.created_at),
        note: refund.note ?? null,
        refund_reason: refund.refund_reason ?? null,
      })),
    },
    order: {
      id: order.id,
      display_id: order.display_id,
      email: order.email ?? null,
      locale: order.locale ?? null,
      status: order.status,
      created_at: toIso(order.created_at),
      total: Number(order.total),
      shipping_total: Number(order.shipping_total),
      shipping_methods: (order.shipping_methods ?? []).map((method) => ({
        name: method.name ?? null,
      })),
      items: (order.items ?? []).map((item) => ({
        product_title: item.product_title ?? null,
        title: item.title,
        variant_title: item.variant_title ?? null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
      shipping_address: order.shipping_address ?? null,
    },
  }
}
