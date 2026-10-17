import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { runSeed } from "../../src/seed"
import checkPaidCartsJob, { config } from "../../src/jobs/check-paid-carts"
import { BANK_TRANSFER_PROVIDER_ID } from "../../src/modules/bank-transfer/constants"
import type { RecoveryAdapter } from "../../src/recovery/adapters"
import { createCartWithPaymentSession, type StoreContext } from "../helpers/checkout"

jest.setTimeout(180 * 1000)

// The test adapter uses the bank transfer provider, because its sessions stay pending until the
// cart completes.
const adapter = (paid: boolean): RecoveryAdapter => ({
  providerId: BANK_TRANSFER_PROVIDER_ID,
  maxSessionsPerRun: 40,
  isSessionPaid: async () => paid,
  paymentReference: () => "ref-1",
})

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("check-paid-carts job", () => {
      let ctx: StoreContext

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        ctx = {
          api,
          regionId: seed.regionId,
          headers: { "x-publishable-api-key": seed.publishableKey },
        }
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

      it("does nothing with the empty adapter list of the template", async () => {
        const { cartId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])

        await checkPaidCartsJob(getContainer())

        expect(await orders()).toHaveLength(0)
        expect((await cart(cartId)).completed_at).toBeNull()
      })

      it("completes the cart of a paid session", async () => {
        const { cartId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])

        await checkPaidCartsJob(getContainer(), [adapter(true)])

        expect(await orders()).toHaveLength(1)
        expect((await cart(cartId)).completed_at).toEqual(expect.any(Date))
        expect(await alerts()).toHaveLength(0)
      })

      it("does nothing for a session that is not paid", async () => {
        const { cartId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])

        await checkPaidCartsJob(getContainer(), [adapter(false)])

        expect(await orders()).toHaveLength(0)
        expect((await cart(cartId)).completed_at).toBeNull()
        expect(await alerts()).toHaveLength(0)
      })

      it("sends one alert to the store owner when the paid cart does not complete", async () => {
        const { cartId } = await createCartWithPaymentSession(ctx, [["TOTE-DEFAULT", 1]])
        // A cart with no shipping method fails the completion.
        const cartModule = getContainer().resolve(Modules.CART)
        const methods = await cartModule.listShippingMethods({ cart_id: cartId })
        await cartModule.deleteShippingMethods(methods.map((m) => m.id))

        await checkPaidCartsJob(getContainer(), [adapter(true)])
        await checkPaidCartsJob(getContainer(), [adapter(true)])

        expect(await orders()).toHaveLength(0)
        const sent = await alerts()
        expect(sent).toHaveLength(1)
        expect(sent[0].to).toBe("owner@example.com")
        expect(sent[0].channel).toBe("email")
        expect(sent[0].data).toMatchObject({
          cart_id: cartId,
          provider_id: "pp_bank-transfer_bank-transfer",
          payment_reference: "ref-1",
          customer_email: "buyer@example.com",
        })
        expect((await cart(cartId)).metadata?.paid_cart_alert_sent_at).toEqual(expect.any(String))
      })
    })
  },
})
