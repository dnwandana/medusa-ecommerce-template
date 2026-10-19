import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
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

      it("translates the labels and keeps the keys for the locale id-ID", async () => {
        const seed = await runSeed(getContainer())
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [shirt],
        } = await query.graph({
          entity: "product",
          fields: ["options.id", "options.title", "options.values.id", "options.values.value"],
          filters: { handle: "plain-t-shirt" },
        })
        const colour = shirt!.options!.find((option: any) => option.title === "Colour")!
        const white = colour.values.find((value: any) => value.value === "White")!
        const {
          data: [cotton],
        } = await query.graph({
          entity: "product_tag",
          fields: ["id"],
          filters: { value: "Fabric: Cotton" },
        })
        // "Corak" is not a colour name in option-names.ts, so only the original title can match.
        await getContainer()
          .resolve(Modules.TRANSLATION)
          .createTranslations([
            {
              reference_id: colour.id,
              reference: "product_option",
              locale_code: "id-ID",
              translations: { title: "Corak" },
            },
            {
              reference_id: white.id,
              reference: "product_option_value",
              locale_code: "id-ID",
              translations: { value: "Putih" },
            },
            {
              reference_id: cotton.id,
              reference: "product_tag",
              locale_code: "id-ID",
              translations: { value: "Fabric: Katun" },
            },
          ])

        const read = (locale: string) =>
          api.get("/store/storefront/catalog/filters", {
            headers: { "x-publishable-api-key": seed.publishableKey, "x-medusa-locale": locale },
          })
        const indonesian = await read("id-ID")
        expect(indonesian.data.colours).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ key: "white", label: "Putih", ids: [white.id] }),
          ])
        )
        expect(indonesian.data.colours.map((c: any) => c.key)).toEqual(["black", "white"])
        expect(indonesian.data.fabrics).toEqual([
          { key: "cotton", label: "Katun", ids: [cotton.id] },
        ])

        const english = await read("en-US")
        expect(english.data.colours.map((c: any) => c.label)).toEqual(["Black", "White"])
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
