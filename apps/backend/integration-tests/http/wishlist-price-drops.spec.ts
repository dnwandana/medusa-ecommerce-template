import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { config } from "../../src/jobs/wishlist-price-drops"
import { readVariantStock } from "../../src/lib/variant-stock"
import { WISHLIST_MODULE } from "../../src/modules/wishlist"
import type WishlistModuleService from "../../src/modules/wishlist/service"
import { runSeed } from "../../src/seed"
import { runPriceDrops } from "../../src/wishlist-alerts/run"
import { Actor, createCustomerWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

// The seed gives TOTE-DEFAULT the price 85000 and 100 in stock.
const TOTE_SKU = "TOTE-DEFAULT"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let toteId: string
    let publishableKey: string

    const query = () => getContainer().resolve(ContainerRegistrationKeys.QUERY)

    beforeEach(async () => {
      const seed = await runSeed(getContainer())
      publishableKey = seed.publishableKey
      const { data } = await query().graph({
        entity: "variant",
        fields: ["id"],
        filters: { sku: TOTE_SKU },
      })
      toteId = data[0]!.id
    })

    describe("wishlist price drops job", () => {
      let customer: Actor
      let email: string

      beforeEach(async () => {
        email = `price-drop-${Date.now()}@test.local`
        customer = await createCustomerWithToken(getContainer(), { email })
      })

      const addToWishlist = (variantId: string) =>
        api.post(
          "/store/customers/me/wishlist/items",
          { variant_id: variantId },
          { headers: { "x-publishable-api-key": publishableKey, ...customer.headers } }
        )

      // The seed price has no rules, so a new price in the store currency replaces it.
      const lowerPrice = async (variantId: string, amount: number) => {
        const {
          data: [variant],
        } = await query().graph({
          entity: "product_variant",
          fields: ["price_set.id"],
          filters: { id: variantId },
        })
        const priceSetId = (variant as { price_set?: { id?: string } | null }).price_set?.id
        if (!priceSetId) {
          throw new Error(`The variant ${variantId} has no price set.`)
        }
        await getContainer()
          .resolve(Modules.PRICING)
          .updatePriceSets(priceSetId, { prices: [{ amount, currency_code: "idr" }] })
      }

      const alerts = () =>
        getContainer()
          .resolve(Modules.NOTIFICATION)
          .listNotifications({ to: email, template: "wishlist-alert" })

      it("has the daily schedule", () => {
        expect(config).toEqual({ name: "wishlist-price-drops", schedule: "0 21 * * *" })
      })

      it("sends one alert after a price drop and none on the next run", async () => {
        await addToWishlist(toteId)
        await lowerPrice(toteId, 10000)

        const first = await runPriceDrops(getContainer())

        expect(first).toEqual({ sent: [customer.id], failed: [] })
        const sent = await alerts()
        expect(sent).toHaveLength(1)
        expect(sent[0]!.to).toBe(email)
        const service: WishlistModuleService = getContainer().resolve(WISHLIST_MODULE)
        const [item] = await service.listWishlistItems({ product_variant_id: toteId })
        expect(item!.saved_unit_price).toBe(10000)

        const second = await runPriceDrops(getContainer())

        expect(second).toEqual({ sent: [], failed: [] })
        expect(await alerts()).toHaveLength(1)
      })

      it("sends no alert when the price does not drop", async () => {
        await addToWishlist(toteId)

        const result = await runPriceDrops(getContainer())

        expect(result).toEqual({ sent: [], failed: [] })
        expect(await alerts()).toHaveLength(0)
      })
    })

    // The review checkpoint of task 02: the link alias "variants" on inventory_item works against
    // the real database.
    describe("readVariantStock", () => {
      it("reads the variant, the product, and the stock of the seeded inventory item", async () => {
        const {
          data: [variant],
        } = await query().graph({
          entity: "variant",
          fields: ["inventory_items.inventory_item_id"],
          filters: { id: toteId },
        })
        const inventoryItemId = (variant as { inventory_items: { inventory_item_id: string }[] })
          .inventory_items[0]!.inventory_item_id

        const stock = await readVariantStock(getContainer(), inventoryItemId)

        expect(stock).toEqual(
          expect.objectContaining({
            variant_id: toteId,
            product_title: "Canvas Tote Bag",
            sku: TOTE_SKU,
            manage_inventory: true,
            inventory_item_id: inventoryItemId,
            available: 100,
          })
        )
      })

      it("returns null for an unknown inventory item", async () => {
        expect(await readVariantStock(getContainer(), "iitem_unknown")).toBeNull()
      })
    })
  },
})
