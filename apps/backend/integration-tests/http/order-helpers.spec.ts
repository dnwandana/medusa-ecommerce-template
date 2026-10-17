import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { runSeed } from "../../src/seed"
import { createAdminWithToken, createCustomerWithToken } from "../helpers/actors"
import { placeOrder } from "../helpers/checkout"
import { getOrderItems, shipOrderItems } from "../helpers/shipping"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("order test helpers", () => {
      it("creates a customer whose token the store API accepts", async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        const customer = await createCustomerWithToken(container, {
          email: "budi@test.local",
          first_name: "Budi",
          last_name: "Santoso",
        })

        const response = await api.get("/store/customers/me", {
          headers: { "x-publishable-api-key": seed.publishableKey, ...customer.headers },
        })

        expect(response.status).toBe(200)
        expect(response.data.customer.id).toBe(customer.id)
        expect(response.data.customer.email).toBe("budi@test.local")
      })

      it("creates an admin whose token the admin API accepts", async () => {
        const admin = await createAdminWithToken(getContainer())

        const response = await api.get("/admin/orders", { headers: admin.headers })

        expect(response.status).toBe(200)
      })

      it("places an order for the customer and ships a part of it", async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        const customer = await createCustomerWithToken(container)
        const ctx = {
          api,
          headers: { "x-publishable-api-key": seed.publishableKey, ...customer.headers },
          regionId: seed.regionId,
        }

        const order = await placeOrder(ctx, [
          ["TSHIRT-M", 3],
          ["TOTE-DEFAULT", 1],
        ])
        // The store response of Medusa 2.21 has no customer_id by default. The Query reads it.
        const {
          data: [saved],
        } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "order",
          filters: { id: order.id },
          fields: ["id", "customer_id"],
        })
        expect(saved.customer_id).toBe(customer.id)

        const before = await getOrderItems(container, order.id)
        expect(before.map((item) => item.sku).sort()).toEqual(["TOTE-DEFAULT", "TSHIRT-M"])
        expect(before.every((item) => item.shipped_quantity === 0)).toBe(true)

        const shirt = before.find((item) => item.sku === "TSHIRT-M")!
        await shipOrderItems(container, order.id, [{ id: shirt.id, quantity: 1 }])

        const after = await getOrderItems(container, order.id)
        expect(after.find((item) => item.sku === "TSHIRT-M")!.shipped_quantity).toBe(1)
        expect(after.find((item) => item.sku === "TOTE-DEFAULT")!.shipped_quantity).toBe(0)
      })

      it("places a bank transfer order with the payment not captured", async () => {
        const container = getContainer()
        const seed = await runSeed(container)
        const headers = { "x-publishable-api-key": seed.publishableKey }
        const order = await placeOrder({ api, headers, regionId: seed.regionId }, [
          ["TOTE-DEFAULT", 1],
        ])

        const response = await api.get(
          `/store/orders/${order.id}?fields=+created_at,+payment_collections.status,*payment_collections.payment_sessions`,
          { headers }
        )

        const collection = response.data.order.payment_collections[0]
        expect(collection.status).toBe("authorized")
        expect(collection.payment_sessions[0].provider_id).toBe("pp_bank-transfer_bank-transfer")
        expect(collection.payment_sessions[0].data).not.toHaveProperty("payment_url")
        expect(typeof response.data.order.created_at).toBe("string")
      })
    })
  },
})
