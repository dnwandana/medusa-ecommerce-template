import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PAYMENT_RECEIPT_MODULE } from "../../src/modules/payment-receipt"
import type PaymentReceiptModuleService from "../../src/modules/payment-receipt/service"
import { runSeed } from "../../src/seed"
import { placeOrder } from "../helpers/checkout"

jest.setTimeout(180 * 1000)

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("GET /store/payment-states", () => {
      let headers: Record<string, string>
      let orderA: { id: string }
      let orderB: { id: string }

      const service = (): PaymentReceiptModuleService =>
        getContainer().resolve(PAYMENT_RECEIPT_MODULE)

      const upload = async (orderId: string, fileName: string) => {
        const res = await api.post(
          `/store/orders/${orderId}/receipts`,
          { file_name: fileName, content: PNG.toString("base64") },
          { headers }
        )
        return res.data.receipt
      }

      const addNote = (orderId: string, note: string) =>
        service().createPaymentNotes({ order_id: orderId, note })

      const capture = async (orderId: string) => {
        const query = getContainer().resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [saved],
        } = await query.graph({
          entity: "order",
          filters: { id: orderId },
          fields: ["payment_collections.payments.id"],
        })
        const paymentId = saved.payment_collections?.[0]?.payments?.[0]?.id as string
        await capturePaymentWorkflow(getContainer()).run({ input: { payment_id: paymentId } })
      }

      const states = async (orderIds: string) =>
        (await api.get(`/store/payment-states?order_id=${orderIds}`, { headers })).data
          .payment_states

      beforeEach(async () => {
        const seed = await runSeed(getContainer())
        headers = { "x-publishable-api-key": seed.publishableKey }
        const ctx = { api, headers, regionId: seed.regionId }
        orderA = await placeOrder(ctx, [["TOTE-DEFAULT", 1]])
        orderB = await placeOrder(ctx, [["TOTE-DEFAULT", 1]])
      })

      // The local receipt storage keeps the files after the database reset. Remove them.
      afterEach(async () => {
        const receipts = await service().listPaymentReceipts({ order_id: [orderA.id, orderB.id] })
        await Promise.all(receipts.map((receipt) => service().removeFile(receipt.file_key)))
      })

      it("gives the state of each known order, in the query order", async () => {
        await upload(orderA.id, "a.png")
        const result = await states(`${orderB.id},order_none,${orderA.id}`)
        expect(result.map((s: { order_id: string }) => s.order_id)).toEqual([orderB.id, orderA.id])
        expect(result[0]).toEqual({
          order_id: orderB.id,
          provider_id: "pp_bank-transfer_bank-transfer",
          captured_at: null,
          receipts: [],
          note: null,
        })
        expect(result[1]).toEqual({
          order_id: orderA.id,
          provider_id: "pp_bank-transfer_bank-transfer",
          captured_at: null,
          receipts: [
            { id: expect.any(String), file_name: "a.png", created_at: expect.any(String) },
          ],
          note: null,
        })
      })

      it("gives the newest note and the capture time", async () => {
        await addNote(orderA.id, "old")
        await addNote(orderA.id, "Rp 50.000 is missing")
        await capture(orderA.id)
        const [state] = await states(orderA.id)
        expect(state.note).toEqual({ note: "Rp 50.000 is missing", created_at: expect.any(String) })
        expect(state.captured_at).toEqual(expect.any(String))
        expect(new Date(state.captured_at).toISOString()).toBe(state.captured_at)
      })

      it("shows no file key, no URL and no session data", async () => {
        await upload(orderA.id, "a.png")
        const res = await api.get(`/store/payment-states?order_id=${orderA.id}`, { headers })
        expect(JSON.stringify(res.data)).not.toMatch(
          /file_key|mime_type|uploads\/|https?:\/\/|"data"/
        )
      })

      it("refuses no id, 51 ids and an extra parameter", async () => {
        const get = (q: string) =>
          api.get(`/store/payment-states?${q}`, { headers, validateStatus: () => true })
        expect((await get("")).status).toBe(400)
        const many = Array.from({ length: 51 }, (_, i) => `order_${i}`).join(",")
        expect((await get(`order_id=${many}`)).status).toBe(400)
        expect((await get(`order_id=${orderA.id}&x=1`)).status).toBe(400)
      })
    })
  },
})
