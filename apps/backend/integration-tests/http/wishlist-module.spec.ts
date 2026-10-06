import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { WISHLIST_MODULE } from "../../src/modules/wishlist"
import WishlistModuleService from "../../src/modules/wishlist/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("wishlist module storage", () => {
      let service: WishlistModuleService

      beforeEach(() => {
        service = getContainer().resolve(WISHLIST_MODULE)
      })

      it("saves a wishlist with an item", async () => {
        const wishlist = await service.createWishlists({ customer_id: "cus_1" })
        const item = await service.createWishlistItems({
          wishlist_id: wishlist.id,
          product_variant_id: "variant_1",
        })

        const [found] = await service.listWishlists(
          { customer_id: "cus_1" },
          { relations: ["items"] }
        )

        expect(found.id).toBe(wishlist.id)
        expect(found.items.map((i) => i.id)).toEqual([item.id])
        expect(item.wishlist_id).toBe(wishlist.id)
      })

      it("rejects a second wishlist for the same customer", async () => {
        await service.createWishlists({ customer_id: "cus_1" })

        await expect(service.createWishlists({ customer_id: "cus_1" })).rejects.toThrow()
        expect(await service.listWishlists({})).toHaveLength(1)
      })

      it("rejects the same variant two times in one wishlist", async () => {
        const wishlist = await service.createWishlists({ customer_id: "cus_1" })
        const input = { wishlist_id: wishlist.id, product_variant_id: "variant_1" }
        await service.createWishlistItems(input)

        await expect(service.createWishlistItems(input)).rejects.toThrow()
        expect(await service.listWishlistItems({})).toHaveLength(1)
      })

      it("accepts the same variant in the wishlists of two customers", async () => {
        const first = await service.createWishlists({ customer_id: "cus_1" })
        const second = await service.createWishlists({ customer_id: "cus_2" })
        await service.createWishlistItems({
          wishlist_id: first.id,
          product_variant_id: "variant_1",
        })
        await service.createWishlistItems({
          wishlist_id: second.id,
          product_variant_id: "variant_1",
        })

        expect(await service.listWishlistItems({})).toHaveLength(2)
      })

      it("accepts a variant again after the removal of its item", async () => {
        const wishlist = await service.createWishlists({ customer_id: "cus_1" })
        const input = { wishlist_id: wishlist.id, product_variant_id: "variant_1" }
        const item = await service.createWishlistItems(input)
        await service.softDeleteWishlistItems(item.id)

        const again = await service.createWishlistItems(input)

        expect(again.id).not.toBe(item.id)
        expect(await service.listWishlistItems({})).toHaveLength(1)
      })
    })
  },
})
