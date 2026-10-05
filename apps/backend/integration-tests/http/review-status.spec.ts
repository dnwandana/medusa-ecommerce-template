import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"
import { runSeed } from "../../src/seed"
import { Actor, createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /admin/reviews/status", () => {
      let admin: Actor
      let storeHeaders: Record<string, string>
      let toteId: string
      let counter = 0

      const service = (): ProductReviewModuleService => getContainer().resolve(PRODUCT_REVIEW_MODULE)

      const add = (status: "pending" | "approved" | "rejected" = "pending") =>
        service().createReviews({
          product_id: toteId,
          customer_id: "cus_1",
          order_line_item_id: `ordli_${++counter}`,
          rating: 4,
          content: "Text",
          first_name: "Budi",
          last_name: "Santoso",
          status,
        })

      const post = (body: unknown, headers: Record<string, string> = admin.headers) =>
        api.post("/admin/reviews/status", body, { headers }).catch((e: any) => e.response)

      const shownIds = async () => {
        const response = await api.get(`/store/products/${toteId}/reviews`, { headers: storeHeaders })
        return response.data.reviews.map((r: any) => r.id)
      }

      const statusOf = async (id: string) => (await service().retrieveReview(id)).status

      beforeEach(async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        storeHeaders = { "x-publishable-api-key": seed.publishableKey }
        admin = await createAdminWithToken(container)
        const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "product",
          fields: ["id"],
          filters: { handle: "canvas-tote-bag" },
        })
        toteId = data[0].id
      })

      it("approves a pending review, and the storefront route shows it", async () => {
        const review = await add()
        expect(await shownIds()).toEqual([])

        const response = await post({ ids: [review.id], status: "approved" })

        expect(response.status).toBe(200)
        expect(response.data.reviews).toHaveLength(1)
        expect(response.data.reviews[0]).toEqual(
          expect.objectContaining({ id: review.id, status: "approved" })
        )
        expect(await shownIds()).toEqual([review.id])
      })

      it("rejects a pending review, and the storefront route does not show it", async () => {
        const review = await add()

        const response = await post({ ids: [review.id], status: "rejected" })

        expect(response.status).toBe(200)
        expect(await statusOf(review.id)).toBe("rejected")
        expect(await shownIds()).toEqual([])
      })

      it("rejects an approved review, and the storefront route stops showing it", async () => {
        const review = await add("approved")
        expect(await shownIds()).toEqual([review.id])

        await post({ ids: [review.id], status: "rejected" })

        expect(await shownIds()).toEqual([])
      })

      it("changes two or more reviews in one request", async () => {
        const first = await add()
        const second = await add()

        const response = await post({ ids: [first.id, second.id], status: "approved" })

        expect(response.data.reviews.map((r: any) => r.status)).toEqual(["approved", "approved"])
        expect((await shownIds()).sort()).toEqual([first.id, second.id].sort())
      })

      it("accepts the same id two times", async () => {
        const review = await add()

        const response = await post({ ids: [review.id, review.id], status: "approved" })

        expect(response.status).toBe(200)
        expect(response.data.reviews).toHaveLength(1)
      })

      // Review Focus: a status request that names one unknown review id together with valid ids.
      it("answers 404 and changes no review when one id is unknown", async () => {
        const review = await add()

        const response = await post({ ids: [review.id, "rev_unknown"], status: "approved" })

        expect(response.status).toBe(404)
        expect(response.data.type).toBe("not_found")
        expect(await statusOf(review.id)).toBe("pending")
      })

      it.each([
        ["the status pending", (id: string) => ({ ids: [id], status: "pending" })],
        ["an unknown status", (id: string) => ({ ids: [id], status: "deleted" })],
        ["an empty list of ids", () => ({ ids: [], status: "approved" })],
        ["no ids", () => ({ status: "approved" })],
        ["no status", (id: string) => ({ ids: [id] })],
      ])("answers 400 invalid_data for %s", async (_name, body) => {
        const review = await add()

        const response = await post(body(review.id))

        expect(response.status).toBe(400)
        expect(response.data.type).toBe("invalid_data")
        expect(await statusOf(review.id)).toBe("pending")
      })

      it("answers 401 with no token", async () => {
        const review = await add()

        const response = await post({ ids: [review.id], status: "approved" }, {})

        expect(response.status).toBe(401)
        expect(await statusOf(review.id)).toBe("pending")
      })
    })
  },
})
