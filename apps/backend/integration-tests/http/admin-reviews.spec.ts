import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../src/modules/product-review"
import ProductReviewModuleService from "../../src/modules/product-review/service"
import { runSeed } from "../../src/seed"
import { Actor, createAdminWithToken, createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /admin/reviews", () => {
      let admin: Actor
      let tote: { id: string; title: string }
      let counter = 0

      const add = (status: "pending" | "approved" | "rejected", content = "Text") =>
        (getContainer().resolve(PRODUCT_REVIEW_MODULE) as ProductReviewModuleService).createReviews({
          product_id: tote.id,
          customer_id: "cus_1",
          order_line_item_id: `ordli_${++counter}`,
          rating: 4,
          content,
          first_name: "Budi",
          last_name: "Santoso",
          status,
        })

      const get = (query = "", headers: Record<string, string> = admin.headers) =>
        api.get(`/admin/reviews${query}`, { headers }).catch((e: any) => e.response)

      beforeEach(async () => {
        const container = getContainer()
        await runSeed(container)
        admin = await createAdminWithToken(container)
        const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "product",
          fields: ["id", "title"],
          filters: { handle: "canvas-tote-bag" },
        })
        tote = data[0]
      })

      it("lists the reviews of each status with the product", async () => {
        await add("pending")
        await add("approved")
        await add("rejected")

        const response = await get()

        expect(response.status).toBe(200)
        expect(response.data.count).toBe(3)
        expect(response.data.limit).toBe(20)
        expect(response.data.offset).toBe(0)
        expect(response.data.reviews.map((r: any) => r.status).sort()).toEqual([
          "approved",
          "pending",
          "rejected",
        ])
        expect(response.data.reviews[0]).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            product_id: tote.id,
            customer_id: "cus_1",
            order_line_item_id: expect.any(String),
            rating: 4,
            title: null,
            content: "Text",
            first_name: "Budi",
            last_name: "Santoso",
            created_at: expect.any(String),
            product: expect.objectContaining({ id: tote.id, title: tote.title }),
          })
        )
      })

      it("filters the list by status", async () => {
        await add("pending", "Waiting")
        await add("approved", "Shown")

        const response = await get("?status=pending")

        expect(response.data.count).toBe(1)
        expect(response.data.reviews.map((r: any) => r.content)).toEqual(["Waiting"])
      })

      it("answers 400 for an unknown status", async () => {
        const response = await get("?status=deleted")

        expect(response.status).toBe(400)
        expect(response.data.type).toBe("invalid_data")
      })

      it("pages the list", async () => {
        await add("pending")
        await add("pending")
        await add("pending")

        const response = await get("?limit=2&offset=2")

        expect(response.data.reviews).toHaveLength(1)
        expect(response.data.count).toBe(3)
        expect(response.data.limit).toBe(2)
        expect(response.data.offset).toBe(2)
      })

      it("returns the newest review first", async () => {
        await add("pending", "Old")
        await new Promise((resolve) => setTimeout(resolve, 20))
        await add("pending", "New")

        const response = await get()

        expect(response.data.reviews.map((r: any) => r.content)).toEqual(["New", "Old"])
      })

      it("answers 401 with no token", async () => {
        const response = await get("", {})

        expect(response.status).toBe(401)
      })

      it("answers 401 for a customer token", async () => {
        const customer = await createCustomerWithToken(getContainer())

        const response = await get("", customer.headers)

        expect(response.status).toBe(401)
      })
    })
  },
})
