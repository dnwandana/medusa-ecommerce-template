import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { config } from "../../src/jobs/review-requests"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import type ProductReviewModuleService from "../../src/modules/product-review/service"
import { runReviewRequests } from "../../src/review-request/run"
import { runSeed } from "../../src/seed"
import { placeOrder, type StoreContext } from "../helpers/checkout"
import { getOrderItems, shipOrderItems } from "../helpers/shipping"

jest.setTimeout(180 * 1000)

// The order is delivered on 20 October, so the request is due on 27 October.
const DELIVERED_AT = "2026-10-20T00:00:00Z"
const FIRST_RUN = new Date("2026-10-27T20:00:00Z")
const SECOND_RUN = new Date("2026-10-28T20:00:00Z")

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("review requests job", () => {
      let ctx: StoreContext

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        ctx = {
          api,
          regionId: seed.regionId,
          headers: { "x-publishable-api-key": seed.publishableKey },
        }
      })

      const fulfillmentIdOf = async (orderId: string): Promise<string> => {
        const { data } = await getContainer()
          .resolve(ContainerRegistrationKeys.QUERY)
          .graph({ entity: "order", fields: ["id", "fulfillments.id"], filters: { id: orderId } })
        const id = data[0]?.fulfillments?.[0]?.id
        if (!id) {
          throw new Error(`The order ${orderId} has no fulfillment.`)
        }
        return id
      }

      // The admin "Mark as delivered" action runs this workflow.
      const markDelivered = async (orderId: string) => {
        await markOrderFulfillmentAsDeliveredWorkflow(getContainer()).run({
          input: { orderId, fulfillmentId: await fulfillmentIdOf(orderId) },
        })
      }

      // The workflow writes the time of the test run. The fulfillment module moves it to a fixed
      // time, so the 7 day delay does not depend on the clock.
      const setDeliveredAt = async (orderId: string, deliveredAt: string) => {
        await getContainer()
          .resolve(Modules.FULFILLMENT)
          .updateFulfillment(await fulfillmentIdOf(orderId), {
            delivered_at: new Date(deliveredAt),
          })
      }

      // Places a bank transfer order with one tote, ships the tote, and marks it as delivered.
      const deliveredOrder = async () => {
        const order = await placeOrder(ctx, [["TOTE-DEFAULT", 1]])
        const [item] = await getOrderItems(getContainer(), order.id)
        await shipOrderItems(getContainer(), order.id, [{ id: item!.id, quantity: 1 }])
        await markDelivered(order.id)
        await setDeliveredAt(order.id, DELIVERED_AT)
        return { order, item: item! }
      }

      const requests = (to: string) =>
        getContainer()
          .resolve(Modules.NOTIFICATION)
          .listNotifications({ to, template: "review-request" })

      const metadataOf = async (orderId: string) => {
        const [order] = await getContainer()
          .resolve(Modules.ORDER)
          .listOrders({ id: orderId }, { select: ["id", "metadata"] })
        return order?.metadata
      }

      it("has the daily schedule", () => {
        expect(config).toEqual({ name: "review-requests", schedule: "0 20 * * *" })
      })

      it("sends one request for an order delivered 7 days ago and never again", async () => {
        const { order } = await deliveredOrder()
        await getContainer()
          .resolve(Modules.ORDER)
          .updateOrders(order.id, { metadata: { source: "test" } })

        const first = await runReviewRequests(getContainer(), FIRST_RUN)

        expect(first).toEqual({ sent: [order.id], skipped: [], failed: [] })
        const sent = await requests(order.email)
        expect(sent).toHaveLength(1)
        expect(sent[0]!.to).toBe(order.email)
        // Medusa merges the metadata, so the mark keeps the other keys.
        expect(await metadataOf(order.id)).toEqual({
          source: "test",
          review_request_sent_at: FIRST_RUN.toISOString(),
        })

        const second = await runReviewRequests(getContainer(), SECOND_RUN)

        expect([second.sent, second.skipped]).toEqual([[], []])
        expect(await requests(order.email)).toHaveLength(1)
      })

      it("waits until 7 days after the delivery", async () => {
        await deliveredOrder()

        const early = await runReviewRequests(getContainer(), new Date("2026-10-26T20:00:00Z"))

        expect(early).toEqual({ sent: [], skipped: [], failed: [] })
      })

      it("writes the mark and sends nothing when the item has a rejected review", async () => {
        const { order, item } = await deliveredOrder()
        const reviews: ProductReviewModuleService = getContainer().resolve(PRODUCT_REVIEW_MODULE)
        await reviews.createReviews({
          product_id: item.product_id,
          customer_id: "cus_1",
          order_line_item_id: item.id,
          rating: 2,
          content: "Text",
          first_name: "Budi",
          last_name: "Santoso",
          status: "rejected",
        })

        const result = await runReviewRequests(getContainer(), FIRST_RUN)

        expect(result).toEqual({ sent: [], skipped: [order.id], failed: [] })
        expect(await requests(order.email)).toHaveLength(0)
        expect((await metadataOf(order.id))?.review_request_sent_at).toBe(FIRST_RUN.toISOString())
      })
    })
  },
})
