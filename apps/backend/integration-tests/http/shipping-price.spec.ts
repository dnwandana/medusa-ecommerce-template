import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("shipping price for a cart", () => {
      let headers: Record<string, string>
      let regionId: string
      let variantIdBySku: Record<string, string>

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        regionId = seed.regionId
        headers = { "x-publishable-api-key": seed.publishableKey }

        const response = await api.get("/store/products?fields=*variants", { headers })
        variantIdBySku = Object.fromEntries(
          response.data.products.flatMap((p: any) => p.variants.map((v: any) => [v.sku, v.id]))
        )
      })

      // Creates a cart with an Indonesian address and the given items.
      const makeCart = async (items: [sku: string, quantity: number][]) => {
        const created = await api.post(
          "/store/carts",
          {
            region_id: regionId,
            email: "buyer@example.com",
            shipping_address: {
              first_name: "Budi",
              last_name: "Santoso",
              address_1: "Jl. Sudirman No. 1",
              city: "Jakarta",
              postal_code: "10220",
              country_code: "id",
              phone: "081234567890",
            },
          },
          { headers }
        )
        const cartId = created.data.cart.id
        for (const [sku, quantity] of items) {
          await api.post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variantIdBySku[sku], quantity },
            { headers }
          )
        }
        return cartId as string
      }

      const shippingOptionId = async (cartId: string) => {
        const response = await api.get(`/store/shipping-options?cart_id=${cartId}`, { headers })
        expect(response.data.shipping_options).toHaveLength(1)
        expect(response.data.shipping_options[0].name).toBe("Standard Shipping")
        expect(response.data.shipping_options[0].price_type).toBe("calculated")
        return response.data.shipping_options[0].id as string
      }

      const calculatedAmount = async (items: [sku: string, quantity: number][]) => {
        const cartId = await makeCart(items)
        const optionId = await shippingOptionId(cartId)
        const response = await api.post(
          `/store/shipping-options/${optionId}/calculate`,
          { cart_id: cartId },
          { headers }
        )
        return response.data.shipping_option.amount
      }

      it("charges IDR 10,000 for a 300 g order", async () => {
        expect(await calculatedAmount([["TOTE-DEFAULT", 1]])).toBe(10000)
      })

      it("charges IDR 20,000 for a 1.2 kg order", async () => {
        expect(await calculatedAmount([["PAN-DEFAULT", 1]])).toBe(20000)
      })

      it("sums the weights before it rounds", async () => {
        // 3 x 200 g + 300 g = 900 g = 1 kg.
        expect(
          await calculatedAmount([
            ["TSHIRT-M", 3],
            ["TOTE-DEFAULT", 1],
          ])
        ).toBe(10000)
        // 3 x 200 g + 300 g + 1200 g = 2100 g = 3 kg.
        expect(
          await calculatedAmount([
            ["TSHIRT-M", 3],
            ["TOTE-DEFAULT", 1],
            ["PAN-DEFAULT", 1],
          ])
        ).toBe(30000)
      })

      it("adds the calculated price to the cart total with no tax", async () => {
        const cartId = await makeCart([["TOTE-DEFAULT", 1]])
        const optionId = await shippingOptionId(cartId)

        const response = await api.post(
          `/store/carts/${cartId}/shipping-methods`,
          { option_id: optionId },
          { headers }
        )

        const cart = response.data.cart
        expect(cart.shipping_methods).toHaveLength(1)
        expect(cart.shipping_methods[0].amount).toBe(10000)
        expect(cart.item_total).toBe(85000)
        expect(cart.shipping_total).toBe(10000)
        expect(cart.tax_total).toBe(0)
        expect(cart.total).toBe(95000)
      })
    })
  },
})
