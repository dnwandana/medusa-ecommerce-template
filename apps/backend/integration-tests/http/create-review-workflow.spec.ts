import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"
import { runSeed } from "../../src/seed"
import { createReviewWorkflow } from "../../src/workflows/create-review"
import { createCustomerWithToken } from "../helpers/actors"
import { CartItem, placePaidOrder } from "../helpers/checkout"
import { installMayarMock, MayarMock } from "../helpers/mayar-mock"
import { getOrderItems, shipOrderItems } from "../helpers/shipping"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("createReviewWorkflow", () => {
      let mock: MayarMock
      let seed: Awaited<ReturnType<typeof runSeed>>

      beforeEach(async () => {
        seed = await runSeed(getContainer())
        mock = installMayarMock()
      })

      afterEach(() => mock.restore())

      const buyer = (names: { first_name?: string | null; last_name?: string | null } = {}) =>
        createCustomerWithToken(getContainer(), names)

      // Places an order for the customer and returns its items.
      const buy = async (customer: { headers: { authorization: string } }, items: CartItem[]) => {
        const ctx = {
          api,
          headers: { "x-publishable-api-key": seed.publishableKey, ...customer.headers },
          regionId: seed.regionId,
        }
        const order = await placePaidOrder(ctx, mock, items)
        return { order, items: await getOrderItems(getContainer(), order.id) }
      }

      const run = (input: Record<string, unknown>) =>
        createReviewWorkflow(getContainer()).run({ input: input as any, throwOnError: false })

      const service = (): ProductReviewModuleService =>
        getContainer().resolve(PRODUCT_REVIEW_MODULE)

      it("creates a pending review for a shipped item", async () => {
        const customer = await buyer({ first_name: "Budi", last_name: "Santoso" })
        const { order, items } = await buy(customer, [["TOTE-DEFAULT", 1]])
        await shipOrderItems(getContainer(), order.id, [{ id: items[0].id, quantity: 1 }])

        const { result, errors } = await run({
          customer_id: customer.id,
          order_line_item_id: items[0].id,
          rating: 4,
          title: "Good",
          content: "Strong bag.",
        })

        expect(errors).toEqual([])
        expect(result.review).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            product_id: items[0].product_id,
            customer_id: customer.id,
            order_line_item_id: items[0].id,
            rating: 4,
            title: "Good",
            content: "Strong bag.",
            first_name: "Budi",
            last_name: "Santoso",
            status: "pending",
          })
        )
      })

      it("saves a review with no title as null", async () => {
        const customer = await buyer()
        const { order, items } = await buy(customer, [["TOTE-DEFAULT", 1]])
        await shipOrderItems(getContainer(), order.id, [{ id: items[0].id, quantity: 1 }])

        const { result } = await run({
          customer_id: customer.id,
          order_line_item_id: items[0].id,
          rating: 5,
          content: "Good.",
        })

        expect(result.review.title).toBeNull()
      })

      // Review Focus: a customer with no first name and no last name.
      it("saves empty names for a customer with no names", async () => {
        const customer = await buyer({ first_name: null, last_name: null })
        const { order, items } = await buy(customer, [["TOTE-DEFAULT", 1]])
        await shipOrderItems(getContainer(), order.id, [{ id: items[0].id, quantity: 1 }])

        const { result, errors } = await run({
          customer_id: customer.id,
          order_line_item_id: items[0].id,
          rating: 5,
          content: "Good.",
        })

        expect(errors).toEqual([])
        expect(result.review.first_name).toBe("")
        expect(result.review.last_name).toBe("")
      })

      it("rejects an item of a different customer with not_found", async () => {
        const owner = await buyer()
        const other = await buyer()
        const { order, items } = await buy(owner, [["TOTE-DEFAULT", 1]])
        await shipOrderItems(getContainer(), order.id, [{ id: items[0].id, quantity: 1 }])

        const { errors } = await run({
          customer_id: other.id,
          order_line_item_id: items[0].id,
          rating: 5,
          content: "Not my item.",
        })

        expect(errors[0].error.type).toBe("not_found")
        expect(errors[0].error.message).toBe("The order item was not found.")
        expect(await service().listReviews({})).toHaveLength(0)
      })

      it("rejects an unknown item with not_found", async () => {
        const customer = await buyer()

        const { errors } = await run({
          customer_id: customer.id,
          order_line_item_id: "ordli_unknown",
          rating: 5,
          content: "Text",
        })

        expect(errors[0].error.type).toBe("not_found")
      })

      it("rejects an item that is not shipped with not_allowed", async () => {
        const customer = await buyer()
        const { order, items } = await buy(customer, [
          ["TSHIRT-M", 3],
          ["TOTE-DEFAULT", 1],
        ])
        const shirt = items.find((item) => item.sku === "TSHIRT-M")!
        const tote = items.find((item) => item.sku === "TOTE-DEFAULT")!
        await shipOrderItems(getContainer(), order.id, [{ id: shirt.id, quantity: 1 }])

        const { errors } = await run({
          customer_id: customer.id,
          order_line_item_id: tote.id,
          rating: 5,
          content: "Too early.",
        })

        expect(errors[0].error.type).toBe("not_allowed")
        expect(errors[0].error.message).toBe("You can review this item after the store ships it.")
        expect(await service().listReviews({})).toHaveLength(0)
      })

      it("accepts an item with 1 of 3 units shipped", async () => {
        const customer = await buyer()
        const { order, items } = await buy(customer, [["TSHIRT-M", 3]])
        await shipOrderItems(getContainer(), order.id, [{ id: items[0].id, quantity: 1 }])

        const { errors } = await run({
          customer_id: customer.id,
          order_line_item_id: items[0].id,
          rating: 3,
          content: "One arrived.",
        })

        expect(errors).toEqual([])
      })

      it("rejects a second review of the same item with duplicate_error", async () => {
        const customer = await buyer()
        const { order, items } = await buy(customer, [["TOTE-DEFAULT", 1]])
        await shipOrderItems(getContainer(), order.id, [{ id: items[0].id, quantity: 1 }])
        const input = {
          customer_id: customer.id,
          order_line_item_id: items[0].id,
          rating: 5,
          content: "First.",
        }
        await run(input)

        const { errors } = await run({ ...input, content: "Second." })

        expect(errors[0].error.type).toBe("duplicate_error")
        expect(errors[0].error.message).toBe("You already reviewed this item.")
        expect(await service().listReviews({})).toHaveLength(1)
      })

      it("accepts a second review of the same product after a second purchase", async () => {
        const customer = await buyer()
        const first = await buy(customer, [["TOTE-DEFAULT", 1]])
        const second = await buy(customer, [["TOTE-DEFAULT", 1]])
        await shipOrderItems(getContainer(), first.order.id, [
          { id: first.items[0].id, quantity: 1 },
        ])
        await shipOrderItems(getContainer(), second.order.id, [
          { id: second.items[0].id, quantity: 1 },
        ])

        await run({
          customer_id: customer.id,
          order_line_item_id: first.items[0].id,
          rating: 5,
          content: "A",
        })
        const { errors } = await run({
          customer_id: customer.id,
          order_line_item_id: second.items[0].id,
          rating: 4,
          content: "B",
        })

        expect(errors).toEqual([])
        expect(await service().listReviews({ product_id: first.items[0].product_id })).toHaveLength(
          2
        )
      })
    })
  },
})
