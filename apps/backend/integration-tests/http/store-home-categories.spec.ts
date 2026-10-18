import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/storefront/home-categories", () => {
      it("returns the categories that staff show on the home page", async () => {
        const seed = await runSeed(getContainer())
        const products = getContainer().resolve(Modules.PRODUCT)
        const shown = await products.createProductCategories({
          name: "Home tiles",
          handle: "home-tiles",
          is_active: true,
          metadata: { show_on_home: true, tile_image_url: "https://assets.example.com/tile.jpg" },
        })
        await products.createProductCategories({
          name: "Hidden",
          handle: "hidden",
          is_active: true,
        })
        await products.createProductCategories({
          name: "Internal",
          handle: "internal",
          is_active: true,
          is_internal: true,
          metadata: { show_on_home: true },
        })
        await products.createProductCategories({
          name: "Inactive",
          handle: "inactive",
          is_active: false,
          metadata: { show_on_home: true },
        })

        const response = await api.get("/store/storefront/home-categories", {
          headers: { "x-publishable-api-key": seed.publishableKey },
        })
        expect(response.data.categories).toEqual([
          {
            id: shown.id,
            name: "Home tiles",
            handle: "home-tiles",
            image: "https://assets.example.com/tile.jpg",
          },
        ])
      })

      it("takes the thumbnail of the newest published product of the category", async () => {
        const seed = await runSeed(getContainer())
        const products = getContainer().resolve(Modules.PRODUCT)
        const category = await products.createProductCategories({
          name: "Tops",
          handle: "tops",
          is_active: true,
          metadata: { show_on_home: true },
        })
        await products.createProducts([
          {
            title: "Old top",
            status: "published",
            thumbnail: "https://assets.example.com/old.jpg",
            category_ids: [category.id],
          },
        ])
        await products.createProducts([
          {
            title: "New top",
            status: "published",
            thumbnail: "https://assets.example.com/new.jpg",
            category_ids: [category.id],
          },
        ])
        await products.createProducts([
          {
            title: "Draft top",
            status: "draft",
            thumbnail: "https://assets.example.com/draft.jpg",
            category_ids: [category.id],
          },
        ])

        const response = await api.get("/store/storefront/home-categories", {
          headers: { "x-publishable-api-key": seed.publishableKey },
        })
        const tile = response.data.categories.find((c: any) => c.id === category.id)
        expect(tile.image).toBe("https://assets.example.com/new.jpg")
      })
    })
  },
})
