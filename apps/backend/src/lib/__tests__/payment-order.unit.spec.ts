import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PAYMENT_ORDER_FIELDS, readPaymentWithOrder } from "../payment-order"

const payment = {
  id: "pay_1",
  provider_id: "pp_bank-transfer_bank-transfer",
  amount: 645000,
  captured_at: "2026-10-21T03:05:00Z",
  refunds: [
    {
      id: "ref_1",
      amount: 645000,
      created_at: "2026-10-21T08:40:00Z",
      note: "BCA 123",
      refund_reason: { label: "Item out of stock" },
    },
  ],
  payment_collection: {
    order: {
      id: "order_1",
      display_id: 1042,
      email: "dewi@example.com",
      locale: "id-ID",
      status: "pending",
      created_at: "2026-10-20T07:30:00Z",
      total: 645000,
      shipping_total: 25000,
      shipping_methods: [{ name: "JNE Regular" }],
      items: [],
      shipping_address: null,
    },
  },
}

const scopeWith = (payments: unknown[]) => {
  const graph = jest.fn().mockResolvedValue({ data: payments })
  const registry: Record<string, unknown> = { [ContainerRegistrationKeys.QUERY]: { graph } }
  const scope = { resolve: (key: string) => registry[key] } as any
  return Object.assign(scope, { graph })
}

describe("readPaymentWithOrder", () => {
  it("reads the payment and its order with one query", async () => {
    const scope = scopeWith([payment])
    await readPaymentWithOrder(scope, "pay_1")
    expect(scope.graph).toHaveBeenCalledTimes(1)
    expect(scope.graph).toHaveBeenCalledWith({
      entity: "payment",
      fields: PAYMENT_ORDER_FIELDS,
      filters: { id: "pay_1" },
    })
    expect(PAYMENT_ORDER_FIELDS).toContain("payment_collection.order.display_id")
  })

  it("returns the payment and the order", async () => {
    const result = await readPaymentWithOrder(scopeWith([payment]), "pay_1")
    expect(result?.order.display_id).toBe(1042)
    expect(result?.payment.refunds[0].refund_reason?.label).toBe("Item out of stock")
    expect(result?.payment).not.toHaveProperty("payment_collection")
  })

  it("returns null without a payment or an order", async () => {
    await expect(readPaymentWithOrder(scopeWith([]), "pay_x")).resolves.toBeNull()
    await expect(
      readPaymentWithOrder(
        scopeWith([{ ...payment, payment_collection: { order: null } }]),
        "pay_1"
      )
    ).resolves.toBeNull()
    await expect(
      readPaymentWithOrder(scopeWith([{ ...payment, payment_collection: null }]), "pay_1")
    ).resolves.toBeNull()
  })

  it("gives an empty refund list when Query gives no refunds", async () => {
    const result = await readPaymentWithOrder(scopeWith([{ ...payment, refunds: null }]), "pay_1")
    expect(result?.payment.refunds).toEqual([])
  })
})
