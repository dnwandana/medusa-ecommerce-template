import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ORDER_FIELDS, useOrders } from "#imports"

const { sdk, getPaymentStates } = vi.hoisted(() => ({
  sdk: { store: { order: { retrieve: vi.fn(), list: vi.fn() } }, client: { fetch: vi.fn() } },
  getPaymentStates: vi.fn(),
}))

mockNuxtImport("useMedusa", () => () => sdk)
mockNuxtImport("useReceipts", () => () => ({ uploadReceipt: vi.fn(), getPaymentStates }))

const { retrieve, list } = sdk.store.order

const state = (orderId: string) => ({
  order_id: orderId,
  provider_id: "pp_bank-transfer_bank-transfer",
  captured_at: null,
  receipts: [],
  note: null,
})

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

beforeEach(() => {
  sdk.store.order.retrieve.mockReset()
  sdk.store.order.list.mockReset()
  sdk.client.fetch.mockReset()
  getPaymentStates.mockReset()
  getPaymentStates.mockResolvedValue([])
  retrieve.mockResolvedValue({ order: { id: "order_1" } })
})

describe("useOrders", () => {
  it("asks for the status, the fulfillments, the shipping methods and the collection status", () => {
    expect(ORDER_FIELDS).toBe(
      "*items,*shipping_address,+item_subtotal,+shipping_total,+total,+created_at,+status,+payment_status,+fulfillment_status,*fulfillments,*shipping_methods,+payment_collections.status"
    )
  })

  // Review Focus: the session data has the payment URL and the customer object of a gateway.
  it("asks the order without the session and payment data", async () => {
    await useOrders().getOrder("order_1")
    const fields = retrieve.mock.calls[0]![1].fields as string
    expect(fields).not.toContain("payment_sessions")
    expect(fields).not.toContain("*payment_collections.payments")
    expect(fields).toContain("+payment_collections.status")
  })

  it("adds the payment state to the order", async () => {
    retrieve.mockResolvedValue({ order: { id: "order_1", status: "pending" } })
    getPaymentStates.mockResolvedValue([state("order_1")])
    expect((await useOrders().getOrder("order_1"))?.payment_state).toEqual(state("order_1"))
    expect(getPaymentStates).toHaveBeenCalledWith(["order_1"])
  })

  it("adds the states to a list with one call", async () => {
    list.mockResolvedValue({ orders: [{ id: "a" }, { id: "b" }], count: 2 })
    getPaymentStates.mockResolvedValue([state("b")])
    const { orders } = await useOrders().listOrders()
    expect(orders.map((order) => order.payment_state?.order_id ?? null)).toEqual([null, "b"])
    expect(getPaymentStates).toHaveBeenCalledTimes(1)
    expect(getPaymentStates).toHaveBeenCalledWith(["a", "b"])
  })

  it("throws when the payment state fails", async () => {
    getPaymentStates.mockRejectedValue(new Error("down"))
    await expect(useOrders().getOrder("order_1")).rejects.toThrow("down")
  })

  it("gets one order with the order fields", async () => {
    sdk.store.order.retrieve.mockResolvedValue({ order: { id: "order_1" } })

    const order = await useOrders().getOrder("order_1")

    expect(order).toEqual({ id: "order_1", payment_state: null })
    expect(sdk.store.order.retrieve).toHaveBeenCalledWith("order_1", { fields: ORDER_FIELDS })
  })

  it("returns null for an order that does not exist", async () => {
    sdk.store.order.retrieve.mockRejectedValue(httpError(404))

    expect(await useOrders().getOrder("order_x")).toBeNull()
  })

  it("throws for a different error", async () => {
    sdk.store.order.retrieve.mockRejectedValue(httpError(500))

    await expect(useOrders().getOrder("order_1")).rejects.toThrow("HTTP 500")
  })

  it("lists the orders of the customer, newest first", async () => {
    sdk.store.order.list.mockResolvedValue({ orders: [{ id: "order_2" }], count: 1 })

    const result = await useOrders().listOrders({ limit: 5, offset: 10 })

    expect(result).toEqual({ orders: [{ id: "order_2", payment_state: null }], count: 1 })
    expect(sdk.store.order.list).toHaveBeenCalledWith({
      limit: 5,
      offset: 10,
      order: "-created_at",
      fields: ORDER_FIELDS,
    })
  })

  it("uses a limit of 20 and an offset of 0 by default", async () => {
    sdk.store.order.list.mockResolvedValue({ orders: [], count: 0 })

    await useOrders().listOrders()

    expect(sdk.store.order.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 })
    )
  })

  it("reads the tracking of one order", async () => {
    sdk.client.fetch.mockResolvedValue({ cancel_reason: null, shipments: [] })
    expect(await useOrders().getTracking("order_1")).toEqual({ cancel_reason: null, shipments: [] })
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/orders/order_1/tracking")
  })

  it("returns null tracking for an order that does not exist", async () => {
    sdk.client.fetch.mockRejectedValue(httpError(404))
    expect(await useOrders().getTracking("order_x")).toBeNull()
  })

  it("throws a tracking error that is not 404", async () => {
    sdk.client.fetch.mockRejectedValue(httpError(500))
    await expect(useOrders().getTracking("order_1")).rejects.toThrow("HTTP 500")
  })
})
