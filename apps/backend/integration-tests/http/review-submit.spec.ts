import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"
import { runSeed } from "../../src/seed"
import { Actor, createCustomerWithToken } from "../helpers/actors"
import { placePaidOrder } from "../helpers/checkout"
import { installMayarMock, MayarMock } from "../helpers/mayar-mock"
import { getOrderItems, PlacedItem, shipOrderItems } from "../helpers/shipping"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/reviews", () => {
      let mock: MayarMock
      let customer: Actor
      let headers: Record<string, string>
      let publishableKey: string
      let shirt: PlacedItem
      let tote: PlacedItem

      // One order with two items. The store shipped 1 of 3 shirts. The tote is not shipped.
      beforeEach(async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        mock = installMayarMock()
        customer = await createCustomerWithToken(container, { first_name: "Budi", last_name: "Santoso" })
        publishableKey = seed.publishableKey
        headers = { "x-publishable-api-key": publishableKey, ...customer.headers }
        const order = await placePaidOrder({ api, headers, regionId: seed.regionId }, mock, [
          ["TSHIRT-M", 3],
          ["TOTE-DEFAULT", 1],
        ])
        const items = await getOrderItems(container, order.id)
        shirt = items.find((item) => item.sku === "TSHIRT-M")!
        tote = items.find((item) => item.sku === "TOTE-DEFAULT")!
        await shipOrderItems(container, order.id, [{ id: shirt.id, quantity: 1 }])
      })

      afterEach(() => mock.restore())

      const post = (body: unknown, requestHeaders = headers) =>
        api.post("/store/reviews", body, { headers: requestHeaders }).catch((e: any) => e.response)

      const savedReviews = () =>
        (getContainer().resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService).listReviews({})

      const valid = () => ({ order_line_item_id: shirt.id, rating: 5, title: "Good", content: "Soft cotton." })

      it("saves a pending review for a shipped item", async () => {
        const response = await post(valid())

        expect(response.status).toBe(200)
        expect(response.data.review).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            product_id: shirt.product_id,
            customer_id: customer.id,
            order_line_item_id: shirt.id,
            rating: 5,
            title: "Good",
            content: "Soft cotton.",
            first_name: "Budi",
            last_name: "Santoso",
            status: "pending",
          })
        )
      })

      it("accepts a review with no title", async () => {
        const response = await post({ order_line_item_id: shirt.id, rating: 1, content: "Bad." })

        expect(response.status).toBe(200)
        expect(response.data.review.title).toBeNull()
      })

      it("removes the spaces around the title and the content", async () => {
        const response = await post({ ...valid(), title: "  Good  ", content: "  Soft cotton.  " })

        expect(response.data.review.title).toBe("Good")
        expect(response.data.review.content).toBe("Soft cotton.")
      })

      it("answers 401 with no customer token", async () => {
        const response = await post(valid(), { "x-publishable-api-key": publishableKey })

        expect(response.status).toBe(401)
        expect(await savedReviews()).toHaveLength(0)
      })

      // Review Focus: a rating of 0, 6, 4.5, or the text "5", and a content of only spaces.
      it.each([
        ["a rating of 0", { rating: 0 }],
        ["a rating of 6", { rating: 6 }],
        ["a rating of 4.5", { rating: 4.5 }],
        ["a rating as text", { rating: "5" }],
        ["no rating", { rating: undefined }],
        ["a content of only spaces", { content: "   " }],
        ["no content", { content: undefined }],
        ["no order line item", { order_line_item_id: undefined }],
        ["an unknown field", { status: "approved" }],
      ])("answers 400 invalid_data for %s", async (_name, change) => {
        const response = await post({ ...valid(), ...change })

        expect(response.status).toBe(400)
        expect(response.data.type).toBe("invalid_data")
        expect(await savedReviews()).toHaveLength(0)
      })

      it("answers 404 for an item of a different customer", async () => {
        const other = await createCustomerWithToken(getContainer())

        const response = await post(valid(), { "x-publishable-api-key": publishableKey, ...other.headers })

        expect(response.status).toBe(404)
        expect(response.data.type).toBe("not_found")
        expect(await savedReviews()).toHaveLength(0)
      })

      it("answers 400 not_allowed for an item that is not shipped", async () => {
        const response = await post({ ...valid(), order_line_item_id: tote.id })

        expect(response.status).toBe(400)
        expect(response.data.type).toBe("not_allowed")
        expect(response.data.message).toBe("You can review this item after the store ships it.")
      })

      it("answers 422 for a second review of the same item", async () => {
        await post(valid())

        const response = await post({ ...valid(), content: "Second." })

        expect(response.status).toBe(422)
        expect(response.data.type).toBe("duplicate_error")
        expect(await savedReviews()).toHaveLength(1)
      })

      it("saves one review for two requests at the same time", async () => {
        const responses = await Promise.all([post(valid()), post(valid())])

        expect(responses.map((r) => r.status).sort()).toEqual([200, 422])
        expect(await savedReviews()).toHaveLength(1)
      })
    })
  },
})
