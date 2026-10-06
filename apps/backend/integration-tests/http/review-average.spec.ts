import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("getAverageRating", () => {
      let service: ProductReviewModuleService
      let counter = 0

      const add = (
        productId: string,
        rating: number,
        status: "pending" | "approved" | "rejected"
      ) =>
        service.createReviews({
          product_id: productId,
          customer_id: "cus_1",
          order_line_item_id: `ordli_${++counter}`,
          rating,
          content: "Text",
          first_name: "Budi",
          last_name: "Santoso",
          status,
        })

      beforeEach(() => {
        service = getContainer().resolve(PRODUCT_REVIEW_MODULE)
      })

      it("returns 0 for a product with no review", async () => {
        expect(await service.getAverageRating("prod_none")).toBe(0)
      })

      it("returns 0 when no review is approved", async () => {
        await add("prod_1", 5, "pending")
        await add("prod_1", 1, "rejected")

        expect(await service.getAverageRating("prod_1")).toBe(0)
      })

      it("uses only the approved reviews of the product", async () => {
        await add("prod_1", 5, "approved")
        await add("prod_1", 4, "approved")
        await add("prod_1", 1, "pending")
        await add("prod_1", 1, "rejected")
        await add("prod_2", 1, "approved")

        expect(await service.getAverageRating("prod_1")).toBe(4.5)
      })

      it("rounds to one decimal", async () => {
        await add("prod_1", 5, "approved")
        await add("prod_1", 4, "approved")
        await add("prod_1", 4, "approved")

        // 13 / 3 = 4.333...
        expect(await service.getAverageRating("prod_1")).toBe(4.3)
      })

      it("ignores a deleted review", async () => {
        await add("prod_1", 5, "approved")
        const low = await add("prod_1", 1, "approved")
        await service.softDeleteReviews(low.id)

        expect(await service.getAverageRating("prod_1")).toBe(5)
      })

      it("treats the product id as data and not as SQL", async () => {
        await add("prod_1", 5, "approved")

        expect(await service.getAverageRating("x' OR '1'='1")).toBe(0)
      })
    })
  },
})
