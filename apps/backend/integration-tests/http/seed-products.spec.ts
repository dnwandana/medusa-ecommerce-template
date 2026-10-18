import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { seedRegion } from "../../src/seed/region"
import { seedFulfillment } from "../../src/seed/fulfillment"
import { seedProducts } from "../../src/seed/products"

jest.setTimeout(120 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    const graph = (entity: string, fields: string[]) =>
      getContainer()
        .resolve(ContainerRegistrationKeys.QUERY)
        .graph({ entity, fields })
        .then((result: any) => result.data)

    const seed = async () => {
      const { salesChannelId } = await seedRegion(getContainer())
      const fulfillment = await seedFulfillment(getContainer(), { salesChannelId })
      const input = {
        salesChannelId,
        shippingProfileId: fulfillment.shippingProfileId,
        stockLocationId: fulfillment.stockLocationId,
      }
      return { input, fulfillment, result: await seedProducts(getContainer(), input) }
    }

    const loadProducts = () =>
      graph("product", [
        "id",
        "handle",
        "title",
        "status",
        "categories.name",
        "sales_channels.name",
        "shipping_profile.id",
        "variants.sku",
        "variants.weight",
        "variants.prices.amount",
        "variants.prices.currency_code",
        "variants.inventory_items.inventory.location_levels.stocked_quantity",
        "tags.value",
        "thumbnail",
        "images.url",
        "images.variants.sku",
        "options.title",
        "categories.parent_category.name",
        "variants.options.value",
      ])

    const BLACK = "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png"
    const WHITE = "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png"

    describe("seedProducts", () => {
      it("creates three published products in the sales channel", async () => {
        const { result, fulfillment } = await seed()
        const products = await loadProducts()

        expect(result.productIds).toHaveLength(3)
        expect(products.map((p: any) => p.handle).sort()).toEqual([
          "canvas-tote-bag",
          "cast-iron-pan",
          "plain-t-shirt",
        ])
        for (const product of products) {
          expect(product.status).toBe("published")
          expect(product.sales_channels.map((c: any) => c.name)).toEqual(["Default Sales Channel"])
          expect(product.shipping_profile.id).toBe(fulfillment.shippingProfileId)
        }
      })

      it("gives each variant a weight, an IDR price, and stock", async () => {
        await seed()
        const products = await loadProducts()
        const variants = products.flatMap((p: any) => p.variants)
        const bySku = Object.fromEntries(variants.map((v: any) => [v.sku, v]))

        expect(Object.keys(bySku).sort()).toEqual([
          "PAN-DEFAULT",
          "TOTE-DEFAULT",
          "TSHIRT-L-BLACK",
          "TSHIRT-L-WHITE",
          "TSHIRT-M-BLACK",
          "TSHIRT-M-WHITE",
          "TSHIRT-S-BLACK",
          "TSHIRT-S-WHITE",
        ])
        expect(bySku["TSHIRT-M-BLACK"].weight).toBe(200)
        expect(bySku["TOTE-DEFAULT"].weight).toBe(300)
        expect(bySku["PAN-DEFAULT"].weight).toBe(1200)
        expect(bySku["TSHIRT-M-BLACK"].prices).toEqual([
          expect.objectContaining({ amount: 150000, currency_code: "idr" }),
        ])
        expect(bySku["TOTE-DEFAULT"].prices[0].amount).toBe(85000)
        expect(bySku["PAN-DEFAULT"].prices[0].amount).toBe(350000)
        for (const variant of variants) {
          expect(variant.inventory_items[0].inventory.location_levels[0].stocked_quantity).toBe(100)
        }
      })

      it("puts the products in the Apparel and Kitchen categories", async () => {
        await seed()
        const products = await loadProducts()
        const category = (handle: string) =>
          products.find((p: any) => p.handle === handle).categories.map((c: any) => c.name)

        expect(category("plain-t-shirt")).toEqual(["Apparel"])
        expect(category("canvas-tote-bag")).toEqual(["Apparel"])
        expect(category("cast-iron-pan")).toEqual(["Kitchen"])
      })

      it("is safe to run again", async () => {
        const { input, result } = await seed()
        const second = await seedProducts(getContainer(), input)

        expect(second.productIds.sort()).toEqual(result.productIds.sort())
        expect(await graph("product", ["id"])).toHaveLength(3)
        expect(await graph("product_category", ["id"])).toHaveLength(3)
      })

      it("gives the T-shirt colours, images and a fabric tag", async () => {
        await seed()
        const shirt = (await loadProducts()).find((p: any) => p.handle === "plain-t-shirt")

        // Medusa 2.21.2 keeps no rank for the product options, so the order is not fixed.
        expect(shirt.options.map((o: any) => o.title).sort()).toEqual(["Colour", "Size"])
        expect(shirt.tags.map((t: any) => t.value)).toEqual(["Fabric: Cotton"])
        expect(shirt.thumbnail).toBe(BLACK)
        const skusOf = (url: string) =>
          shirt.images
            .find((i: any) => i.url === url)
            .variants.map((v: any) => v.sku)
            .sort()
        expect(skusOf(BLACK)).toEqual(["TSHIRT-L-BLACK", "TSHIRT-M-BLACK", "TSHIRT-S-BLACK"])
        expect(skusOf(WHITE)).toEqual(["TSHIRT-L-WHITE", "TSHIRT-M-WHITE", "TSHIRT-S-WHITE"])
      })

      it("puts Apparel below Clothing", async () => {
        await seed()
        const shirt = (await loadProducts()).find((p: any) => p.handle === "plain-t-shirt")

        expect(shirt.categories[0].name).toBe("Apparel")
        expect(shirt.categories[0].parent_category.name).toBe("Clothing")
      })
    })
  },
})
