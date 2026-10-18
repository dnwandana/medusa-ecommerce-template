import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"
import { createCustomerWithToken } from "../helpers/actors"
import { placeOrder, type StoreContext } from "../helpers/checkout"
import { getOrderItems, shipOrderItems } from "../helpers/shipping"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/orders/:id/tracking", () => {
      let container: MedusaContainer
      let ctx: StoreContext
      let headers: Record<string, string>

      beforeEach(async () => {
        container = getContainer()
        const seed = await runSeed(container)
        const customer = await createCustomerWithToken(container)
        headers = { "x-publishable-api-key": seed.publishableKey }
        ctx = { api, headers: { ...headers, ...customer.headers }, regionId: seed.regionId }
      })

      it("returns the shipped fulfillment with its labels and items", async () => {
        const order = await placeOrder(ctx, [["TSHIRT-M-BLACK", 3]])
        const [line] = await getOrderItems(container, order.id)
        await shipOrderItems(
          container,
          order.id,
          [{ id: line!.id, quantity: 3 }],
          [
            {
              tracking_number: "JP1234567890",
              tracking_url: "https://track.example.com/JP1234567890",
              label_url: "#",
            },
          ]
        )

        const response = await api.get(`/store/orders/${order.id}/tracking`, { headers })

        expect(response.status).toBe(200)
        expect(Object.keys(response.data).sort()).toEqual(["cancel_reason", "shipments"])
        expect(response.data.cancel_reason).toBeNull()
        expect(response.data.shipments).toHaveLength(1)
        expect(response.data.shipments[0].shipped_at).toEqual(expect.any(String))
        expect(response.data.shipments[0].labels).toEqual([
          {
            tracking_number: "JP1234567890",
            tracking_url: "https://track.example.com/JP1234567890",
          },
        ])
        expect(response.data.shipments[0].items).toEqual([
          { line_item_id: line!.id, title: expect.any(String), quantity: 3 },
        ])
      })

      it("drops a label with no number and gives null for an empty URL", async () => {
        const order = await placeOrder(ctx, [["TSHIRT-M-BLACK", 1]])
        const [line] = await getOrderItems(container, order.id)
        await shipOrderItems(
          container,
          order.id,
          [{ id: line!.id, quantity: 1 }],
          [
            { tracking_number: "", tracking_url: "https://track.example.com/x", label_url: "#" },
            { tracking_number: "JP1", tracking_url: "", label_url: "#" },
          ]
        )

        const response = await api.get(`/store/orders/${order.id}/tracking`, { headers })

        expect(response.data.shipments[0].labels).toEqual([
          { tracking_number: "JP1", tracking_url: null },
        ])
      })

      it("returns no shipment for a fulfillment that is not shipped", async () => {
        const order = await placeOrder(ctx, [["TSHIRT-M-BLACK", 1]])
        const [line] = await getOrderItems(container, order.id)
        await createOrderFulfillmentWorkflow(container).run({
          input: { order_id: order.id, items: [{ id: line!.id, quantity: 1 }] },
        })

        const response = await api.get(`/store/orders/${order.id}/tracking`, { headers })

        expect(response.data.shipments).toEqual([])
      })

      it("returns the cancel reason from the order metadata", async () => {
        const order = await placeOrder(ctx, [["TSHIRT-M-BLACK", 1]])
        await container
          .resolve(Modules.ORDER)
          .updateOrders(order.id, { metadata: { cancel_reason: "payment_timeout" } })

        const response = await api.get(`/store/orders/${order.id}/tracking`, { headers })

        expect(response.data.cancel_reason).toBe("payment_timeout")
      })

      it("returns null for a cancel reason that is not a known code", async () => {
        const order = await placeOrder(ctx, [["TSHIRT-M-BLACK", 1]])
        await container
          .resolve(Modules.ORDER)
          .updateOrders(order.id, { metadata: { cancel_reason: "Customer phoned, 0812 3456 789" } })

        const response = await api.get(`/store/orders/${order.id}/tracking`, { headers })

        expect(response.data.cancel_reason).toBeNull()
      })

      it("returns 404 for an unknown order", async () => {
        const error = await api
          .get("/store/orders/order_missing/tracking", { headers })
          .catch((e: any) => e)
        expect(error.response.status).toBe(404)
      })
    })
  },
})
