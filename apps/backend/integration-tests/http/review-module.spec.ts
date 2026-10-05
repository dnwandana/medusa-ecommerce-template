import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("product-review module storage", () => {
      let service: ProductReviewModuleService

      const input = (overrides: Record<string, unknown> = {}) => ({
        product_id: "prod_1",
        customer_id: "cus_1",
        order_line_item_id: "ordli_1",
        rating: 5,
        content: "Good quality.",
        first_name: "Budi",
        last_name: "Santoso",
        ...overrides,
      })

      beforeEach(() => {
        service = getContainer().resolve(PRODUCT_REVIEW_MODULE)
      })

      it("saves a review with the status pending and no title", async () => {
        const review = await service.createReviews(input())

        expect(review.id).toEqual(expect.any(String))
        expect(review.status).toBe("pending")
        expect(review.title).toBeNull()
        expect(review.rating).toBe(5)
      })

      it("rejects a rating of 6 and a rating of 0", async () => {
        await expect(service.createReviews(input({ rating: 6 }))).rejects.toThrow()
        await expect(
          service.createReviews(input({ rating: 0, order_line_item_id: "ordli_2" }))
        ).rejects.toThrow()
        expect(await service.listReviews({})).toHaveLength(0)
      })

      it("rejects a second review for the same order line item", async () => {
        await service.createReviews(input())

        await expect(service.createReviews(input({ rating: 3 }))).rejects.toThrow()
        expect(await service.listReviews({})).toHaveLength(1)
      })

      it("accepts a second review of the same product for a different order line item", async () => {
        await service.createReviews(input())
        await service.createReviews(input({ order_line_item_id: "ordli_2" }))

        expect(await service.listReviews({ product_id: "prod_1" })).toHaveLength(2)
      })
    })
  },
})
