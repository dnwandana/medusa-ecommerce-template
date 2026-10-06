import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { runSeed } from "../../src/seed"
import { Actor, createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/customers/me/wishlist", () => {
      let customer: Actor
      let headers: Record<string, string>
      let publishableKey: string
      let tote: { id: string; product_id: string }
      let pan: { id: string; product_id: string }

      const add = (variantId: string, requestHeaders = headers) =>
        api.post(
          "/store/customers/me/wishlist/items",
          { variant_id: variantId },
          { headers: requestHeaders }
        )

      const get = (requestHeaders = headers) =>
        api
          .get("/store/customers/me/wishlist", { headers: requestHeaders })
          .catch((e: any) => e.response)

      beforeEach(async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        publishableKey = seed.publishableKey
        customer = await createCustomerWithToken(container)
        headers = { "x-publishable-api-key": publishableKey, ...customer.headers }
        const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "variant",
          fields: ["id", "sku", "product_id"],
          filters: { sku: ["TOTE-DEFAULT", "PAN-DEFAULT"] },
        })
        tote = data.find((v: any) => v.sku === "TOTE-DEFAULT")! as {
          id: string
          product_id: string
        }
        pan = data.find((v: any) => v.sku === "PAN-DEFAULT")! as { id: string; product_id: string }
      })

      it("returns an empty wishlist with the id null for a customer with no wishlist", async () => {
        const response = await get()

        expect(response.status).toBe(200)
        expect(response.data).toEqual({ wishlist: { id: null, items: [] } })
      })

      it("returns the items with the variant, the product, and the price", async () => {
        const added = await add(tote.id)

        const response = await get()

        expect(response.status).toBe(200)
        expect(response.data.wishlist.id).toBe(added.data.wishlist_item.wishlist_id)
        expect(response.data.wishlist.items).toHaveLength(1)
        const item = response.data.wishlist.items[0]
        expect(item.id).toBe(added.data.wishlist_item.id)
        expect(item.product_variant_id).toBe(tote.id)
        expect(item.product_variant).toEqual(
          expect.objectContaining({
            id: tote.id,
            title: expect.any(String),
            sku: "TOTE-DEFAULT",
            calculated_price: expect.objectContaining({
              calculated_amount: 85000,
              currency_code: "idr",
            }),
            product: expect.objectContaining({
              id: tote.product_id,
              title: expect.any(String),
              handle: "canvas-tote-bag",
            }),
          })
        )
        expect(item.product_variant.product).toHaveProperty("thumbnail")
      })

      it("returns the items in the sequence of their creation", async () => {
        await add(pan.id)
        await add(tote.id)

        const response = await get()

        expect(response.data.wishlist.items.map((i: any) => i.product_variant.sku)).toEqual([
          "PAN-DEFAULT",
          "TOTE-DEFAULT",
        ])
      })

      it("does not show the wishlist of a different customer", async () => {
        await add(tote.id)
        const other = await createCustomerWithToken(getContainer())
        const otherHeaders = { "x-publishable-api-key": publishableKey, ...other.headers }
        await add(pan.id, otherHeaders)

        const mine = await get()
        const theirs = await get(otherHeaders)

        expect(mine.data.wishlist.items.map((i: any) => i.product_variant_id)).toEqual([tote.id])
        expect(theirs.data.wishlist.items.map((i: any) => i.product_variant_id)).toEqual([pan.id])
        expect(theirs.data.wishlist.id).not.toBe(mine.data.wishlist.id)
      })

      // Review Focus: a wishlist variant that the store owner deleted.
      it("omits an item whose product the store owner deleted", async () => {
        await add(tote.id)
        await add(pan.id)
        await getContainer().resolve(Modules.PRODUCT).softDeleteProducts([tote.product_id])

        const response = await get()

        expect(response.status).toBe(200)
        expect(response.data.wishlist.items.map((i: any) => i.product_variant_id)).toEqual([pan.id])
      })

      // Review Focus: the store owner deletes only the variant and keeps the product.
      it("omits an item whose variant the store owner deleted", async () => {
        await add(tote.id)
        await add(pan.id)
        await getContainer().resolve(Modules.PRODUCT).softDeleteProductVariants([tote.id])

        const response = await get()

        expect(response.status).toBe(200)
        expect(response.data.wishlist.items.map((i: any) => i.product_variant_id)).toEqual([pan.id])
      })

      it("answers 401 with no customer token", async () => {
        const response = await get({ "x-publishable-api-key": publishableKey })

        expect(response.status).toBe(401)
      })
    })
  },
})
