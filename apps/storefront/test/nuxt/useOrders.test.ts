import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ORDER_FIELDS, useOrders } from "#imports"

const { sdk } = vi.hoisted(() => ({
  sdk: { store: { order: { retrieve: vi.fn(), list: vi.fn() } }, client: { fetch: vi.fn() } },
}))

mockNuxtImport("useMedusa", () => () => sdk)

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

beforeEach(() => {
  sdk.store.order.retrieve.mockReset()
  sdk.store.order.list.mockReset()
  sdk.client.fetch.mockReset()
})

describe("useOrders", () => {
  it("asks for the status, the fulfillments, the shipping methods and the payments", () => {
    expect(ORDER_FIELDS).toBe(
      "*items,*shipping_address,+item_subtotal,+shipping_total,+total,+created_at,+status,+payment_status,+fulfillment_status,*fulfillments,*shipping_methods,+payment_collections.status,*payment_collections.payment_sessions,*payment_collections.payments"
    )
  })

  it("gets one order with the order fields", async () => {
    sdk.store.order.retrieve.mockResolvedValue({ order: { id: "order_1" } })

    const order = await useOrders().getOrder("order_1")

    expect(order).toEqual({ id: "order_1" })
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

    expect(result).toEqual({ orders: [{ id: "order_2" }], count: 1 })
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
