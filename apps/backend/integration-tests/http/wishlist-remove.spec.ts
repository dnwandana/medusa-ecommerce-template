import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../src/modules/wishlist"
import WishlistModuleService from "../../src/modules/wishlist/service"
import { runSeed } from "../../src/seed"
import { Actor, createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("DELETE /store/customers/me/wishlist/items/:id", () => {
      let customer: Actor
      let headers: Record<string, string>
      let publishableKey: string
      let toteId: string
      let panId: string

      const service = (): WishlistModuleService => getContainer().resolve(WISHLIST_MODULE)

      const add = async (variantId: string, requestHeaders = headers) => {
        const response = await api.post(
          "/store/customers/me/wishlist/items",
          { variant_id: variantId },
          { headers: requestHeaders }
        )
        return response.data.wishlist_item as { id: string; wishlist_id: string }
      }

      const remove = (itemId: string, requestHeaders = headers) =>
        api
          .delete(`/store/customers/me/wishlist/items/${itemId}`, { headers: requestHeaders })
          .catch((e: any) => e.response)

      beforeEach(async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        publishableKey = seed.publishableKey
        customer = await createCustomerWithToken(container)
        headers = { "x-publishable-api-key": publishableKey, ...customer.headers }
        const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "variant",
          fields: ["id", "sku"],
          filters: { sku: ["TOTE-DEFAULT", "PAN-DEFAULT"] },
        })
        toteId = data.find((v: any) => v.sku === "TOTE-DEFAULT")!.id
        panId = data.find((v: any) => v.sku === "PAN-DEFAULT")!.id
      })

      it("removes the item and keeps the other items", async () => {
        const tote = await add(toteId)
        const pan = await add(panId)

        const response = await remove(tote.id)

        expect(response.status).toBe(200)
        expect(response.data).toEqual({ id: tote.id, object: "wishlist_item", deleted: true })
        expect((await service().listWishlistItems({})).map((i) => i.id)).toEqual([pan.id])
      })

      it("answers 404 for an item of a different customer and keeps the item", async () => {
        const tote = await add(toteId)
        const other = await createCustomerWithToken(getContainer())
        const otherHeaders = { "x-publishable-api-key": publishableKey, ...other.headers }
        await add(panId, otherHeaders)

        const response = await remove(tote.id, otherHeaders)

        expect(response.status).toBe(404)
        expect(response.data.type).toBe("not_found")
        expect(response.data.message).toBe("The wishlist item was not found.")
        expect(await service().listWishlistItems({ id: tote.id })).toHaveLength(1)
      })

      it("answers 404 for a different customer who has no wishlist", async () => {
        const tote = await add(toteId)
        const other = await createCustomerWithToken(getContainer())

        const response = await remove(tote.id, {
          "x-publishable-api-key": publishableKey,
          ...other.headers,
        })

        expect(response.status).toBe(404)
        expect(await service().listWishlistItems({ id: tote.id })).toHaveLength(1)
      })

      it("answers 404 for an unknown item", async () => {
        await add(toteId)

        const response = await remove("wishitem_unknown")

        expect(response.status).toBe(404)
        expect(response.data.message).toBe("The wishlist item was not found.")
      })

      it("answers 404 for a second removal of the same item", async () => {
        const tote = await add(toteId)
        await remove(tote.id)

        const response = await remove(tote.id)

        expect(response.status).toBe(404)
      })

      it("lets the customer add the variant again after the removal", async () => {
        const first = await add(toteId)
        await remove(first.id)

        const second = await add(toteId)

        expect(second.id).not.toBe(first.id)
        expect(second.wishlist_id).toBe(first.wishlist_id)
        expect(await service().listWishlistItems({})).toHaveLength(1)
      })

      it("answers 401 with no customer token and keeps the item", async () => {
        const tote = await add(toteId)

        const response = await remove(tote.id, { "x-publishable-api-key": publishableKey })

        expect(response.status).toBe(401)
        expect(await service().listWishlistItems({ id: tote.id })).toHaveLength(1)
      })
    })
  },
})
