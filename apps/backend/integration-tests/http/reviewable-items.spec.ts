import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"
import { Actor, createCustomerWithToken } from "../helpers/actors"
import { placePaidOrder } from "../helpers/checkout"
import { installMayarMock, MayarMock } from "../helpers/mayar-mock"
import { getOrderItems, PlacedItem, shipOrderItems } from "../helpers/shipping"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/customers/me/reviewable-items", () => {
      let mock: MayarMock
      let customer: Actor
      let headers: Record<string, string>
      let publishableKey: string
      let order: any
      let shirt: PlacedItem
      let tote: PlacedItem

      // One order with two items. The store shipped 1 of 3 shirts. The tote is not shipped.
      beforeEach(async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        mock = installMayarMock()
        customer = await createCustomerWithToken(container)
        publishableKey = seed.publishableKey
        headers = { "x-publishable-api-key": publishableKey, ...customer.headers }
        order = await placePaidOrder({ api, headers, regionId: seed.regionId }, mock, [
          ["TSHIRT-M", 3],
          ["TOTE-DEFAULT", 1],
        ])
        const items = await getOrderItems(container, order.id)
        shirt = items.find((item) => item.sku === "TSHIRT-M")!
        tote = items.find((item) => item.sku === "TOTE-DEFAULT")!
        await shipOrderItems(container, order.id, [{ id: shirt.id, quantity: 1 }])
      })

      afterEach(() => mock.restore())

      const get = (requestHeaders = headers) =>
        api
          .get("/store/customers/me/reviewable-items", { headers: requestHeaders })
          .catch((e: any) => e.response)

      it("lists only the shipped item of an order that ships in parts", async () => {
        const response = await get()

        expect(response.status).toBe(200)
        expect(response.data.items).toHaveLength(1)
        expect(Object.keys(response.data.items[0]).sort()).toEqual([
          "order_display_id",
          "order_id",
          "order_line_item_id",
          "product_id",
          "product_title",
          "thumbnail",
          "variant_title",
        ])
        expect(response.data.items[0]).toEqual(
          expect.objectContaining({
            order_id: order.id,
            order_display_id: order.display_id,
            order_line_item_id: shirt.id,
            product_id: shirt.product_id,
            product_title: expect.any(String),
          })
        )
      })

      it("adds the second item after the store ships it", async () => {
        await shipOrderItems(getContainer(), order.id, [{ id: tote.id, quantity: 1 }])

        const response = await get()

        expect(response.data.items.map((item: any) => item.order_line_item_id).sort()).toEqual(
          [shirt.id, tote.id].sort()
        )
      })

      it("removes an item after the customer reviews it, before the approval", async () => {
        await api.post(
          "/store/reviews",
          { order_line_item_id: shirt.id, rating: 5, content: "Good." },
          { headers }
        )

        const response = await get()

        expect(response.data.items).toEqual([])
      })

      it("returns an empty list for a customer with no order", async () => {
        const other = await createCustomerWithToken(getContainer())

        const response = await get({ "x-publishable-api-key": publishableKey, ...other.headers })

        expect(response.status).toBe(200)
        expect(response.data.items).toEqual([])
      })

      it("answers 401 with no customer token", async () => {
        const response = await get({ "x-publishable-api-key": publishableKey })

        expect(response.status).toBe(401)
      })
    })
  },
})
