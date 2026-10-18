import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/storefront/catalog/filters", () => {
      it("returns the filter values of all products", async () => {
        const seed = await runSeed(getContainer())
        const response = await api.get("/store/storefront/catalog/filters", {
          headers: { "x-publishable-api-key": seed.publishableKey },
        })
        expect(Object.keys(response.data).sort()).toEqual(["colours", "fabrics", "sizes"])
        expect(response.data.sizes.length).toBeGreaterThan(0)
        expect(response.data.sizes.map((size: any) => size.key)).toEqual(["s", "m", "l"])
        expect(response.data.fabrics).toEqual([
          { key: "cotton", label: "Cotton", ids: [expect.any(String)] },
        ])
      })

      it("filters by category and by a part of the title", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [kitchen],
        } = await query.graph({
          entity: "product_category",
          fields: ["id"],
          filters: { name: "Kitchen" },
        })

        const byCategory = await api.get(
          `/store/storefront/catalog/filters?category_id=${kitchen.id}`,
          { headers }
        )
        expect(byCategory.data).toEqual({ sizes: [], colours: [], fabrics: [] })

        const byTitle = await api.get("/store/storefront/catalog/filters?q=t-SHIRT", { headers })
        expect(byTitle.data.colours.map((colour: any) => colour.key)).toEqual(["black", "white"])

        const noMatch = await api.get("/store/storefront/catalog/filters?q=%25", { headers })
        expect(noMatch.data).toEqual({ sizes: [], colours: [], fabrics: [] })
      })

      it("covers the products of each category in a list of categories", async () => {
        const seed = await runSeed(getContainer())
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const { data: categories } = await query.graph({
          entity: "product_category",
          fields: ["id", "name"],
          filters: { name: ["Clothing", "Apparel"] },
        })
        const id = (name: string) => categories.find((category: any) => category.name === name)!.id

        // The products are in Apparel, the child of Clothing.
        const parentOnly = await api.get(
          `/store/storefront/catalog/filters?category_id=${id("Clothing")}`,
          { headers }
        )
        expect(parentOnly.data).toEqual({ sizes: [], colours: [], fabrics: [] })

        const commaList = await api.get(
          `/store/storefront/catalog/filters?category_id=${id("Clothing")},${id("Apparel")}`,
          { headers }
        )
        expect(commaList.data.sizes.map((size: any) => size.key)).toEqual(["s", "m", "l"])

        const repeated = await api.get(
          `/store/storefront/catalog/filters?category_id[]=${id("Clothing")}&category_id[]=${id("Apparel")}`,
          { headers }
        )
        expect(repeated.data).toEqual(commaList.data)
      })

      it("rejects an unknown query field", async () => {
        const seed = await runSeed(getContainer())
        const response = await api
          .get("/store/storefront/catalog/filters?sort=x", {
            headers: { "x-publishable-api-key": seed.publishableKey },
          })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })
    })
  },
})
