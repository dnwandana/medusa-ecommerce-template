import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { runSeed } from "../../src/seed"
import {
  createCartWithPaymentSession,
  createCartWithShipping,
  placePaidOrder,
  type StoreContext,
} from "../helpers/checkout"
import { installMayarMock, type MayarMock } from "../helpers/mayar-mock"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("checkout with Mayar", () => {
      let ctx: StoreContext
      let mock: MayarMock

      beforeEach(async () => {
        mock = installMayarMock()
        const seed = await runSeed(getContainer())
        ctx = {
          api,
          regionId: seed.regionId,
          headers: { "x-publishable-api-key": seed.publishableKey },
        }
      })

      afterEach(() => {
        mock.restore()
      })

      const complete = (cartId: string) =>
        api.post(`/store/carts/${cartId}/complete`, {}, { headers: ctx.headers })

      const orders = async () => {
        const { data } = await getContainer()
          .resolve(ContainerRegistrationKeys.QUERY)
          .graph({ entity: "order", fields: ["id"] })
        return data
      }

      it("creates one invoice for the cart total and stores the payment URL", async () => {
        const { sessionId, invoiceId, paymentCollectionId, total } =
          await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])

        expect(total).toBe(95000)
        expect(mock.invoices.size).toBe(1)
        expect(mock.invoices.get(invoiceId)).toMatchObject({
          amount: 95000,
          status: "unpaid",
          extraData: { session_id: sessionId },
        })

        const { data } = await getContainer()
          .resolve(ContainerRegistrationKeys.QUERY)
          .graph({
            entity: "payment_session",
            fields: ["id", "status", "data", "provider_id"],
            filters: { payment_collection_id: paymentCollectionId },
          })
        expect(data).toHaveLength(1)
        expect(data[0].provider_id).toBe("pp_mayar_mayar")
        expect(data[0].status).toBe("pending")
        expect(data[0].data).toMatchObject({
          invoice_id: invoiceId,
          payment_url: `https://mayar.test/pay/${invoiceId}`,
          amount: 95000,
        })
      })

      it("creates the order when the invoice is paid", async () => {
        const order = await placePaidOrder(ctx, mock, [["TOTE-DEFAULT", 1]])
        // The completion route does not return payment_status, so read the order again.
        const stored = await api.get(`/store/orders/${order.id}?fields=+payment_status`, {
          headers: ctx.headers,
        })

        expect(order.total).toBe(95000)
        expect(stored.data.order.payment_status).toBe("captured")
        expect(await orders()).toHaveLength(1)
      })

      it("returns the same order for a second completion", async () => {
        const { cartId, invoiceId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])
        mock.setInvoiceStatus(invoiceId, "paid")

        const first = await complete(cartId)
        const second = await complete(cartId)

        expect(first.data.type).toBe("order")
        expect(second.data.type).toBe("order")
        expect(second.data.order.id).toBe(first.data.order.id)
        expect(await orders()).toHaveLength(1)
      })

      it("keeps the cart when the invoice is not paid, and completes it after the payment", async () => {
        const { cartId, invoiceId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])

        const unpaid = await complete(cartId)

        expect(unpaid.status).toBe(200)
        expect(unpaid.data.type).toBe("cart")
        expect(unpaid.data.error).toBeDefined()
        expect(await orders()).toHaveLength(0)

        mock.setInvoiceStatus(invoiceId, "paid")
        const paid = await complete(cartId)

        expect(paid.data.type).toBe("order")
        expect(await orders()).toHaveLength(1)
      })

      // Review Focus: a paid invoice with a different amount must not create an order.
      it("creates no order when the paid amount is different from the cart total", async () => {
        const { cartId, invoiceId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])
        mock.setInvoiceAmount(invoiceId, 1)
        mock.setInvoiceStatus(invoiceId, "paid")

        const response = await complete(cartId)

        expect(response.data.type).toBe("cart")
        expect(await orders()).toHaveLength(0)
      })

      it("closes the invoice when the cart changes, and uses a new invoice", async () => {
        const { cartId, invoiceId, paymentCollectionId } = await createCartWithPaymentSession(ctx, [
          ["TOTE-DEFAULT", 1],
        ])
        const cart = await api.get(`/store/carts/${cartId}`, { headers: ctx.headers })

        await api.post(
          `/store/carts/${cartId}/line-items/${cart.data.cart.items[0].id}`,
          { quantity: 2 },
          { headers: ctx.headers }
        )

        expect(mock.invoices.get(invoiceId)?.status).toBe("closed")

        const withSession = await api.post(
          `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
          {
            provider_id: "pp_mayar_mayar",
            data: {
              customer: {
                name: "Budi Santoso",
                email: "buyer@example.com",
                mobile: "081234567890",
              },
            },
          },
          { headers: ctx.headers }
        )
        const session = withSession.data.payment_collection.payment_sessions[0]

        expect(session.data.invoice_id).not.toBe(invoiceId)
        // 2 x 85000 + 10000 for 600 g.
        expect(mock.invoices.get(session.data.invoice_id)?.amount).toBe(180000)
      })

      it("reports an error and keeps the cart when Mayar is down", async () => {
        const { cartId } = await createCartWithShipping(ctx, [["TOTE-DEFAULT", 1]])
        const collection = await api.post(
          "/store/payment-collections",
          { cart_id: cartId },
          { headers: ctx.headers }
        )
        mock.setDown(true)

        const response = await api
          .post(
            `/store/payment-collections/${collection.data.payment_collection.id}/payment-sessions`,
            {
              provider_id: "pp_mayar_mayar",
              data: {
                customer: {
                  name: "Budi Santoso",
                  email: "buyer@example.com",
                  mobile: "081234567890",
                },
              },
            },
            { headers: ctx.headers }
          )
          .catch((error: any) => error.response)

        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(mock.invoices.size).toBe(0)

        const cart = await api.get(`/store/carts/${cartId}`, { headers: ctx.headers })
        expect(cart.data.cart.completed_at).toBeNull()
        expect(cart.data.cart.total).toBe(95000)
        expect(await orders()).toHaveLength(0)
      })
    })
  },
})
