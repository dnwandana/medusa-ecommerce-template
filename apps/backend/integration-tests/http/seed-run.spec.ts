import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("runSeed", () => {
      it("gives a store that lists the three products with the key", async () => {
        const result = await runSeed(getContainer())

        expect(result.publishableKey).toMatch(/^pk_[A-Za-z0-9]+$/)
        expect(result.regionId).toEqual(expect.any(String))
        expect(result.shippingOptionId).toEqual(expect.any(String))

        const response = await api.get(`/store/products?region_id=${result.regionId}`, {
          headers: { "x-publishable-api-key": result.publishableKey },
        })
        expect(response.status).toBe(200)
        expect(response.data.products.map((p: any) => p.handle).sort()).toEqual([
          "canvas-tote-bag",
          "cast-iron-pan",
          "plain-t-shirt",
        ])
      })

      it("returns the same result on a second run", async () => {
        const first = await runSeed(getContainer())
        const second = await runSeed(getContainer())

        expect(second).toEqual(first)
        const response = await api.get("/store/products", {
          headers: { "x-publishable-api-key": second.publishableKey },
        })
        expect(response.data.products).toHaveLength(3)
      })
    })
  },
})
