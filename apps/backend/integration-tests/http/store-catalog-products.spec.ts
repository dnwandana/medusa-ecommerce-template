import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/storefront/catalog/products", () => {
      it("returns one page in price order with stock", async () => {
        const seed = await runSeed(getContainer())
        const response = await api.get(
          `/store/storefront/catalog/products?region_id=${seed.regionId}&sort=price-asc&limit=2`,
          { headers: { "x-publishable-api-key": seed.publishableKey } }
        )
        const { products, count, limit, offset } = response.data
        expect({ limit, offset }).toEqual({ limit: 2, offset: 0 })
        expect(products).toHaveLength(2)
        expect(count).toBeGreaterThanOrEqual(products.length)
        const prices = products.map((p: any) =>
          Math.min(...p.variants.map((v: any) => v.calculated_price.calculated_amount))
        )
        expect(prices).toEqual([...prices].sort((a, b) => a - b))
        expect(products[0].variants[0]).toHaveProperty("inventory_quantity")
      })

      it("filters by an option value id and by a price range", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [shirt],
        } = await query.graph({
          entity: "product",
          fields: ["id", "options.title", "options.values.id", "options.values.value"],
          filters: { handle: "plain-t-shirt" },
        })
        const black = shirt!
          .options!.find((option: any) => option.title === "Colour")!
          .values.find((value: any) => value.value === "Black")!

        const byColour = await api.get(
          `/store/storefront/catalog/products?region_id=${seed.regionId}&colour=${black.id}`,
          { headers }
        )
        expect(byColour.data.count).toBe(1)
        expect(byColour.data.products[0]).toMatchObject({ id: shirt.id, handle: "plain-t-shirt" })
        const variant = byColour.data.products[0].variants[0]
        expect(variant).toHaveProperty("manage_inventory")
        expect(variant).toHaveProperty("allow_backorder")
        expect(variant.options.length).toBeGreaterThan(0)
        expect(variant.inventory_quantity).toBe(100)

        const byPrice = await api.get(
          `/store/storefront/catalog/products?region_id=${seed.regionId}&price_from=100000&price_to=150000`,
          { headers }
        )
        expect(byPrice.data.count).toBe(0)
      })

      it("lists the products of each category in a list of categories once", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const { data: categories } = await query.graph({
          entity: "product_category",
          fields: ["id", "name"],
          filters: { name: ["Clothing", "Apparel"] },
        })
        const id = (name: string) => categories.find((category: any) => category.name === name)!.id
        const {
          data: [shirt],
        } = await query.graph({
          entity: "product",
          fields: ["id"],
          filters: { handle: "plain-t-shirt" },
        })
        // A product in the parent and in the child shows one time.
        await updateProductsWorkflow(getContainer()).run({
          input: {
            selector: { id: shirt.id },
            update: { category_ids: [id("Clothing"), id("Apparel")] },
          },
        })

        const response = await api.get(
          `/store/storefront/catalog/products?region_id=${seed.regionId}&sort=price-asc&category_id=${id("Clothing")},${id("Apparel")}`,
          { headers }
        )
        expect(response.data.count).toBe(2)
        expect(response.data.products.map((product: any) => product.handle)).toEqual([
          "canvas-tote-bag",
          "plain-t-shirt",
        ])
      })

      it("needs a region", async () => {
        const seed = await runSeed(getContainer())
        const response = await api
          .get("/store/storefront/catalog/products", {
            headers: { "x-publishable-api-key": seed.publishableKey },
          })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("returns 404 for an unknown region", async () => {
        const seed = await runSeed(getContainer())
        const response = await api
          .get("/store/storefront/catalog/products?region_id=reg_unknown", {
            headers: { "x-publishable-api-key": seed.publishableKey },
          })
          .catch((e: any) => e.response)
        expect(response.status).toBe(404)
      })
    })
  },
})
