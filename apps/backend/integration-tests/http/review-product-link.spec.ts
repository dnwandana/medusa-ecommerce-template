import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("link from a review to its product", () => {
      it("reads the product of a review through the Query", async () => {
        const container = getContainer()
        await runSeed(container)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const service: ProductReviewModuleService = container.resolve(PRODUCT_REVIEW_MODULE)

        const {
          data: [product],
        } = await query.graph({
          entity: "product",
          fields: ["id", "title"],
          filters: { handle: "canvas-tote-bag" },
        })
        const review = await service.createReviews({
          product_id: product.id,
          customer_id: "cus_1",
          order_line_item_id: "ordli_1",
          rating: 4,
          content: "Strong bag.",
          first_name: "Budi",
          last_name: "Santoso",
        })

        const { data } = await query.graph({
          entity: "review",
          fields: ["id", "rating", "product.id", "product.title"],
          filters: { id: review.id },
        })

        expect(data).toHaveLength(1)
        expect(data[0].product?.id).toBe(product.id)
        expect(data[0].product?.title).toBe(product.title)
      })
    })
  },
})
