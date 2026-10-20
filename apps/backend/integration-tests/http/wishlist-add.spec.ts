import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../src/modules/wishlist"
import WishlistModuleService from "../../src/modules/wishlist/service"
import { runSeed } from "../../src/seed"
import { Actor, createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/customers/me/wishlist/items", () => {
      let customer: Actor
      let headers: Record<string, string>
      let publishableKey: string
      let toteId: string
      let panId: string

      const service = (): WishlistModuleService => getContainer().resolve(WISHLIST_MODULE)

      const post = (body: unknown, requestHeaders = headers) =>
        api
          .post("/store/customers/me/wishlist/items", body, { headers: requestHeaders })
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

      it("creates the wishlist on the first add and returns the item", async () => {
        const response = await post({ variant_id: toteId })

        expect(response.status).toBe(200)
        expect(response.data).toEqual({
          wishlist_item: {
            id: expect.any(String),
            wishlist_id: expect.any(String),
            product_variant_id: toteId,
          },
        })
        const wishlists = await service().listWishlists({ customer_id: customer.id })
        expect(wishlists).toHaveLength(1)
        expect(wishlists[0].id).toBe(response.data.wishlist_item.wishlist_id)
      })

      it("adds a second variant to the same wishlist", async () => {
        const first = await post({ variant_id: toteId })
        const second = await post({ variant_id: panId })

        expect(second.data.wishlist_item.wishlist_id).toBe(first.data.wishlist_item.wishlist_id)
        expect(second.data.wishlist_item.id).not.toBe(first.data.wishlist_item.id)
        expect(await service().listWishlists({})).toHaveLength(1)
        expect(await service().listWishlistItems({})).toHaveLength(2)
      })

      it("returns the existing item for a duplicate add", async () => {
        const first = await post({ variant_id: toteId })

        const second = await post({ variant_id: toteId })

        expect(second.status).toBe(200)
        expect(second.data.wishlist_item).toEqual(first.data.wishlist_item)
        expect(await service().listWishlistItems({})).toHaveLength(1)
      })

      // Review Focus: two add requests for the same variant at the same time.
      it("returns one item for two requests at the same time", async () => {
        const [first, second] = await Promise.all([
          post({ variant_id: toteId }),
          post({ variant_id: toteId }),
        ])

        expect(first.status).toBe(200)
        expect(second.status).toBe(200)
        expect(second.data.wishlist_item.id).toBe(first.data.wishlist_item.id)
        expect(await service().listWishlists({})).toHaveLength(1)
        expect(await service().listWishlistItems({})).toHaveLength(1)
      })

      it("gives each customer a separate wishlist", async () => {
        const other = await createCustomerWithToken(getContainer())
        const first = await post({ variant_id: toteId })

        const second = await post(
          { variant_id: toteId },
          { "x-publishable-api-key": publishableKey, ...other.headers }
        )

        expect(second.status).toBe(200)
        expect(second.data.wishlist_item.wishlist_id).not.toBe(first.data.wishlist_item.wishlist_id)
        expect(await service().listWishlists({})).toHaveLength(2)
      })

      it("answers 404 for an unknown variant and creates no wishlist", async () => {
        const response = await post({ variant_id: "variant_unknown" })

        expect(response.status).toBe(404)
        expect(response.data.type).toBe("not_found")
        expect(response.data.message).toBe("The product variant was not found.")
        expect(await service().listWishlists({})).toHaveLength(0)
      })

      it.each([
        ["no variant id", {}],
        ["an empty variant id", { variant_id: "" }],
        ["a variant id that is not text", { variant_id: 5 }],
        ["an unknown field", { variant_id: "variant_1", customer_id: "cus_other" }],
      ])("answers 400 invalid_data for %s", async (_name, body) => {
        const response = await post(body)

        expect(response.status).toBe(400)
        expect(response.data.type).toBe("invalid_data")
      })

      // The seed gives TOTE-DEFAULT the price 85000 and 100 in stock.
      it("saves the price and the availability of the variant", async () => {
        const response = await post({ variant_id: toteId })

        expect(response.status).toBe(200)
        const [item] = await service().listWishlistItems({ id: response.data.wishlist_item.id })
        expect(item.saved_unit_price).toBe(85000)
        expect(item.available).toBe(true)
        expect(item.alerted_at).toBeNull()
      })

      it("saves available false for a variant with no stock", async () => {
        const container = getContainer()
        const {
          data: [variant],
        } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "variant",
          fields: [
            "inventory_items.inventory_item_id",
            "inventory_items.inventory.location_levels.location_id",
          ],
          filters: { id: toteId },
        })
        const link = (variant as any).inventory_items[0]
        await container.resolve(Modules.INVENTORY).updateInventoryLevels(
          link.inventory.location_levels.map((level: any) => ({
            inventory_item_id: link.inventory_item_id,
            location_id: level.location_id,
            stocked_quantity: 0,
          }))
        )

        const response = await post({ variant_id: toteId })

        expect(response.status).toBe(200)
        const [item] = await service().listWishlistItems({ id: response.data.wishlist_item.id })
        expect(item.available).toBe(false)
        expect(item.saved_unit_price).toBe(85000)
      })

      it("creates the item with no price and available true when the price read fails", async () => {
        const regions = getContainer().resolve(Modules.REGION)
        const spy = jest
          .spyOn(regions, "listRegions")
          .mockRejectedValueOnce(new Error("The region read failed"))

        try {
          const response = await post({ variant_id: toteId })

          expect(response.status).toBe(200)
          const [item] = await service().listWishlistItems({ id: response.data.wishlist_item.id })
          expect(item.saved_unit_price).toBeNull()
          expect(item.available).toBe(true)
        } finally {
          spy.mockRestore()
        }
      })

      it("does not change an existing item on a duplicate add", async () => {
        const first = await post({ variant_id: toteId })
        await service().updateWishlistItems({
          id: first.data.wishlist_item.id,
          saved_unit_price: 90000,
          available: false,
        })

        const second = await post({ variant_id: toteId })

        expect(second.status).toBe(200)
        const [item] = await service().listWishlistItems({ id: first.data.wishlist_item.id })
        expect(item.saved_unit_price).toBe(90000)
        expect(item.available).toBe(false)
      })

      it("answers 401 with no customer token", async () => {
        const response = await post(
          { variant_id: toteId },
          { "x-publishable-api-key": publishableKey }
        )

        expect(response.status).toBe(401)
        expect(await service().listWishlists({})).toHaveLength(0)
      })
    })
  },
})
