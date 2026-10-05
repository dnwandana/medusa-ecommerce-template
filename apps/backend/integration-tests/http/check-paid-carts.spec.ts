import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { runSeed } from "../../src/seed"
import checkPaidCartsJob, { config } from "../../src/jobs/check-paid-carts"
import { createCartWithPaymentSession, type StoreContext } from "../helpers/checkout"
import { installMayarMock, type MayarMock } from "../helpers/mayar-mock"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("check-paid-carts job", () => {
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

      const query = () => getContainer().resolve(ContainerRegistrationKeys.QUERY)

      const orders = async () => (await query().graph({ entity: "order", fields: ["id"] })).data

      const cart = async (cartId: string) =>
        (
          await query().graph({
            entity: "cart",
            fields: ["id", "completed_at", "metadata"],
            filters: { id: cartId },
          })
        ).data[0]

      const alerts = async () => {
        const notifications = await getContainer()
          .resolve(Modules.NOTIFICATION)
          .listNotifications({}, { take: 100 })
        return notifications.filter((n: any) => n.template === "paid-cart-alert")
      }

      it("runs each 15 minutes", () => {
        expect(config).toEqual({ name: "check-paid-carts", schedule: "*/15 * * * *" })
      })

      it("completes the cart of a paid invoice", async () => {
        const { cartId, invoiceId } = await createCartWithPaymentSession(ctx, [
          ["TOTE-DEFAULT", 1],
        ])
        mock.setInvoiceStatus(invoiceId, "paid")

        await checkPaidCartsJob(getContainer())

        expect(await orders()).toHaveLength(1)
        expect((await cart(cartId)).completed_at).not.toBeNull()
        expect(await alerts()).toHaveLength(0)
      })

      it("does nothing for an invoice that is not paid", async () => {
        const { cartId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])

        await checkPaidCartsJob(getContainer())

        expect(await orders()).toHaveLength(0)
        expect((await cart(cartId)).completed_at).toBeNull()
        expect(await alerts()).toHaveLength(0)
      })

      it("sends one alert to the store owner when the paid cart does not complete", async () => {
        const { cartId, invoiceId } = await createCartWithPaymentSession(ctx, [
          ["TOTE-DEFAULT", 1],
        ])
        // A paid invoice with a different amount fails the completion.
        mock.setInvoiceAmount(invoiceId, 1)
        mock.setInvoiceStatus(invoiceId, "paid")

        await checkPaidCartsJob(getContainer())

        expect(await orders()).toHaveLength(0)
        const sent = await alerts()
        expect(sent).toHaveLength(1)
        expect(sent[0].to).toBe("owner@example.com")
        expect(sent[0].channel).toBe("email")
        expect(sent[0].data).toMatchObject({
          cart_id: cartId,
          invoice_id: invoiceId,
          customer_email: "buyer@example.com",
          amount: 95000,
        })
        expect((await cart(cartId)).metadata?.paid_cart_alert_sent_at).toEqual(expect.any(String))

        const requestsAfterFirstRun = mock.requests.length
        await checkPaidCartsJob(getContainer())

        expect(await alerts()).toHaveLength(1)
        expect(mock.requests).toHaveLength(requestsAfterFirstRun)
      })

      it("makes no request to Mayar when MAYAR_API_KEY is empty", async () => {
        const { invoiceId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])
        mock.setInvoiceStatus(invoiceId, "paid")
        const requestsBefore = mock.requests.length
        const key = process.env.MAYAR_API_KEY
        process.env.MAYAR_API_KEY = ""

        try {
          await checkPaidCartsJob(getContainer())
        } finally {
          process.env.MAYAR_API_KEY = key
        }

        expect(mock.requests).toHaveLength(requestsBefore)
        expect(await orders()).toHaveLength(0)
      })
    })
  },
})
