import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("product translations", () => {
      // Returns the product with the given handle, in the given locale.
      const getProduct = async (
        seed: { publishableKey: string; regionId: string },
        handle: string,
        locale?: string
      ) => {
        const response = await api.get(
          `/store/products?handle=${handle}&region_id=${seed.regionId}`,
          {
            headers: {
              "x-publishable-api-key": seed.publishableKey,
              ...(locale ? { "x-medusa-locale": locale } : {}),
            },
          }
        )
        expect(response.status).toBe(200)
        return response.data.products[0]
      }

      it("returns the Indonesian title for the locale id-ID", async () => {
        const seed = await runSeed(getContainer())
        const original = await getProduct(seed, "plain-t-shirt")

        await getContainer()
          .resolve(Modules.TRANSLATION)
          .createTranslations({
            reference_id: original.id,
            reference: "product",
            locale_code: "id-ID",
            translations: { title: "Kaus Polos" },
          })

        const indonesian = await getProduct(seed, "plain-t-shirt", "id-ID")
        const english = await getProduct(seed, "plain-t-shirt", "en-US")

        expect(indonesian.title).toBe("Kaus Polos")
        expect(english.title).toBe(original.title)
      })

      it("returns the original title when a product has no translation", async () => {
        const seed = await runSeed(getContainer())
        const original = await getProduct(seed, "canvas-tote-bag")

        const indonesian = await getProduct(seed, "canvas-tote-bag", "id-ID")

        expect(indonesian.title).toBe(original.title)
      })
    })
  },
})
