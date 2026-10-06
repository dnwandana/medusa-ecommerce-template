import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../../src/modules/wishlist"
import WishlistModuleService from "../../src/modules/wishlist/service"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("wishlist links", () => {
      it("reads the customer of a wishlist and the variant of a wishlist item", async () => {
        const container = getContainer()
        await runSeed(container)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const service: WishlistModuleService = container.resolve(WISHLIST_MODULE)

        const customer = await container
          .resolve(Modules.CUSTOMER)
          .createCustomers({ email: "budi@test.local" })
        const {
          data: [variant],
        } = await query.graph({
          entity: "variant",
          fields: ["id", "sku"],
          filters: { sku: "TOTE-DEFAULT" },
        })
        const wishlist = await service.createWishlists({ customer_id: customer.id })
        await service.createWishlistItems({
          wishlist_id: wishlist.id,
          product_variant_id: variant.id,
        })

        const { data } = await query.graph({
          entity: "wishlist",
          fields: ["id", "customer.email", "items.id", "items.product_variant.sku"],
          filters: { id: wishlist.id },
        })

        expect(data).toHaveLength(1)
        expect(data[0].customer?.email).toBe("budi@test.local")
        expect(data[0].items).toHaveLength(1)
        expect(data[0].items[0]?.product_variant?.sku).toBe("TOTE-DEFAULT")
      })
    })
  },
})
