import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/products/:id/reviews", () => {
      let headers: Record<string, string>
      let toteId: string
      let panId: string
      let counter = 0

      const add = (
        productId: string,
        rating: number,
        status: "pending" | "approved" | "rejected",
        content = "Text"
      ) =>
        (getContainer().resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService).createReviews(
          {
            product_id: productId,
            customer_id: "cus_secret",
            order_line_item_id: `ordli_${++counter}`,
            rating,
            title: null,
            content,
            first_name: "Budi",
            last_name: "Santoso",
            status,
          }
        )

      const get = (productId: string, query = "") =>
        api
          .get(`/store/products/${productId}/reviews${query}`, { headers })
          .catch((e: any) => e.response)

      beforeEach(async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        headers = { "x-publishable-api-key": seed.publishableKey }
        const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "product",
          fields: ["id", "handle"],
          filters: { handle: ["canvas-tote-bag", "cast-iron-pan"] },
        })
        toteId = data.find((p: any) => p.handle === "canvas-tote-bag")!.id
        panId = data.find((p: any) => p.handle === "cast-iron-pan")!.id
      })

      it("returns an empty list and an average of 0 for a product with no review", async () => {
        const response = await get(toteId)

        expect(response.status).toBe(200)
        expect(response.data).toEqual({
          reviews: [],
          count: 0,
          limit: 10,
          offset: 0,
          average_rating: 0,
        })
      })

      it("returns only the approved reviews of the product", async () => {
        await add(toteId, 5, "approved", "Approved")
        await add(toteId, 1, "pending", "Pending")
        await add(toteId, 1, "rejected", "Rejected")
        await add(panId, 2, "approved", "Other product")

        const response = await get(toteId)

        expect(response.data.count).toBe(1)
        expect(response.data.reviews.map((r: any) => r.content)).toEqual(["Approved"])
        expect(response.data.average_rating).toBe(5)
      })

      it("returns only the public fields of a review", async () => {
        const review = await add(toteId, 4, "approved")

        const response = await get(toteId)

        expect(Object.keys(response.data.reviews[0]).sort()).toEqual([
          "content",
          "created_at",
          "first_name",
          "id",
          "last_name",
          "product_id",
          "rating",
          "title",
        ])
        expect(response.data.reviews[0]).toEqual(
          expect.objectContaining({
            id: review.id,
            product_id: toteId,
            rating: 4,
            title: null,
            content: "Text",
            first_name: "Budi",
            last_name: "Santoso",
          })
        )
      })

      it("does not return a private field when the request asks for it", async () => {
        await add(toteId, 4, "approved")

        const response = await get(toteId, "?fields=id,customer_id,order_line_item_id,status")

        const body = JSON.stringify(response.data)
        expect(body).not.toContain("cus_secret")
        expect(body).not.toContain("ordli_")
      })

      it("pages the list and keeps the count and the average of all approved reviews", async () => {
        await add(toteId, 5, "approved", "First")
        await add(toteId, 4, "approved", "Second")
        await add(toteId, 4, "approved", "Third")

        const response = await get(toteId, "?limit=2&offset=2")

        expect(response.data.reviews).toHaveLength(1)
        expect(response.data.count).toBe(3)
        expect(response.data.limit).toBe(2)
        expect(response.data.offset).toBe(2)
        expect(response.data.average_rating).toBe(4.3)
      })

      it("returns the newest review first", async () => {
        await add(toteId, 5, "approved", "Old")
        await new Promise((resolve) => setTimeout(resolve, 20))
        await add(toteId, 5, "approved", "New")

        const response = await get(toteId)

        expect(response.data.reviews.map((r: any) => r.content)).toEqual(["New", "Old"])
      })

      it("returns 10 reviews by default", async () => {
        for (let i = 0; i < 12; i++) {
          await add(toteId, 5, "approved")
        }

        const response = await get(toteId)

        expect(response.data.reviews).toHaveLength(10)
        expect(response.data.count).toBe(12)
        expect(response.data.limit).toBe(10)
      })

      it("returns an empty list for an unknown product", async () => {
        const response = await get("prod_unknown")

        expect(response.status).toBe(200)
        expect(response.data.count).toBe(0)
        expect(response.data.average_rating).toBe(0)
      })
    })
  },
})
