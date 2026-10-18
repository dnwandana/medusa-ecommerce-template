import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PAYMENT_RECEIPT_MODULE } from "../../src/modules/payment-receipt"
import type PaymentReceiptModuleService from "../../src/modules/payment-receipt/service"
import { runPaymentTimeout } from "../../src/payment-timeout/run"
import { runSeed } from "../../src/seed"
import { placeOrder, type StoreContext } from "../helpers/checkout"
import { getOrderItems, shipOrderItems } from "../helpers/shipping"

jest.setTimeout(180 * 1000)

const NOW = new Date("2026-10-19T12:00:00Z")

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("payment timeout job", () => {
      let ctx: StoreContext

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        ctx = {
          api,
          regionId: seed.regionId,
          headers: { "x-publishable-api-key": seed.publishableKey },
        }
      })

      const orderModule = () => getContainer().resolve(Modules.ORDER)

      const moveTo = async (orderId: string, createdAt: string) => {
        await getContainer()
          .resolve(ContainerRegistrationKeys.PG_CONNECTION)
          .raw('UPDATE "order" SET created_at = ? WHERE id = ?', [createdAt, orderId])
      }

      // Places a bank transfer order, then moves its placement time to the given time.
      const placeAt = async (createdAt: string) => {
        const order = await placeOrder(ctx, [["TOTE-DEFAULT", 1]])
        await moveTo(order.id, createdAt)
        return order
      }

      // The receipt row comes from the module service, so the test does not need the upload route.
      const addReceipt = async (orderId: string, fileName: string) => {
        const service: PaymentReceiptModuleService = getContainer().resolve(PAYMENT_RECEIPT_MODULE)
        await service.createPaymentReceipts({
          order_id: orderId,
          file_key: `${orderId}/prcpt_test.png`,
          file_name: fileName,
          mime_type: "image/png",
          size: 3,
        })
      }

      it("cancels an unpaid bank order with no receipt after 24 hours and writes the reason", async () => {
        const old = await placeAt("2026-10-18T10:00:00Z")
        await orderModule().updateOrders(old.id, { metadata: { source: "test" } })

        const result = await runPaymentTimeout(getContainer(), NOW)

        expect(result).toEqual({ cancelled: [old.id], failed: [] })
        const [order] = await orderModule().listOrders(
          { id: old.id },
          { select: ["id", "status", "metadata"] }
        )
        expect(order.status).toBe("canceled")
        expect(order.metadata).toEqual({ source: "test", cancel_reason: "payment_timeout" })
      })

      it("keeps an order with a receipt and an order younger than 24 hours", async () => {
        const withReceipt = await placeAt("2026-10-18T10:00:00Z")
        await addReceipt(withReceipt.id, "a.png")
        const young = await placeAt("2026-10-18T13:00:00Z")

        const result = await runPaymentTimeout(getContainer(), NOW)

        expect(result).toEqual({ cancelled: [], failed: [] })
        const orders = await orderModule().listOrders(
          { id: [withReceipt.id, young.id] },
          { select: ["id", "status"] }
        )
        expect(orders.map((o) => o.status)).toEqual(["pending", "pending"])
      })

      it("keeps an order that gets a receipt after the job selects it", async () => {
        const late = await placeAt("2026-10-18T10:00:00Z")
        await addReceipt(late.id, "late.png")
        // The first read is the selection. It sees no receipt, as before an upload at that time.
        const service: PaymentReceiptModuleService = getContainer().resolve(PAYMENT_RECEIPT_MODULE)
        const spy = jest.spyOn(service, "listPaymentReceipts").mockResolvedValueOnce([])

        try {
          const result = await runPaymentTimeout(getContainer(), NOW)

          expect(spy).toHaveBeenCalled()
          expect(result).toEqual({ cancelled: [], failed: [] })
        } finally {
          spy.mockRestore()
        }
        const [order] = await orderModule().listOrders(
          { id: late.id },
          { select: ["id", "status", "metadata"] }
        )
        expect(order.status).toBe("pending")
        expect(order.metadata?.cancel_reason).toBeUndefined()
      })

      it("goes on after one order fails", async () => {
        // The cancellation of a shipped order fails. The order ships before the time moves back.
        const shipped = await placeOrder(ctx, [["TOTE-DEFAULT", 1]])
        const [item] = await getOrderItems(getContainer(), shipped.id)
        await shipOrderItems(getContainer(), shipped.id, [{ id: item.id, quantity: 1 }])
        await moveTo(shipped.id, "2026-10-18T09:00:00Z")
        const old = await placeAt("2026-10-18T10:00:00Z")

        const result = await runPaymentTimeout(getContainer(), NOW)

        expect(result).toEqual({ cancelled: [old.id], failed: [shipped.id] })
        const [order] = await orderModule().listOrders(
          { id: shipped.id },
          { select: ["id", "status", "metadata"] }
        )
        expect(order.status).not.toBe("canceled")
        expect(order.metadata?.cancel_reason).toBeUndefined()
      })
    })
  },
})
