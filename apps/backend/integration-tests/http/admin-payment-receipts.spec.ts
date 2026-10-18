import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow, capturePaymentWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PAYMENT_RECEIPT_MODULE } from "../../src/modules/payment-receipt"
import type PaymentReceiptModuleService from "../../src/modules/payment-receipt/service"
import { runSeed } from "../../src/seed"
import { createAdminWithToken, type Actor } from "../helpers/actors"
import { placeOrder } from "../helpers/checkout"

jest.setTimeout(180 * 1000)

const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let storeHeaders: Record<string, string>
    let admin: { headers: Actor["headers"] }
    let order: { id: string }

    const service = (): PaymentReceiptModuleService =>
      getContainer().resolve(PAYMENT_RECEIPT_MODULE)

    const upload = async (orderId: string, fileName: string) => {
      const res = await api.post(
        `/store/orders/${orderId}/receipts`,
        { file_name: fileName, content: pngBytes.toString("base64") },
        { headers: storeHeaders }
      )
      return res.data.receipt as { id: string; file_name: string; created_at: string }
    }

    const cancel = async (orderId: string) => {
      await cancelOrderWorkflow(getContainer()).run({ input: { order_id: orderId } })
    }

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

    beforeEach(async () => {
      const container = getContainer()
      const seed = await runSeed(container)
      storeHeaders = { "x-publishable-api-key": seed.publishableKey }
      const actor = await createAdminWithToken(container)
      admin = { headers: actor.headers }
      order = await placeOrder({ api, headers: storeHeaders, regionId: seed.regionId }, [
        ["TOTE-DEFAULT", 1],
      ])
    })

    // The local receipt storage keeps the files after the database reset. Remove them.
    afterEach(async () => {
      const receipts = await service().listPaymentReceipts({ order_id: order.id })
      await Promise.all(receipts.map((receipt) => service().removeFile(receipt.file_key)))
    })

    describe("read routes", () => {
      it("lists the receipts of an order for an admin", async () => {
        await upload(order.id, "a.png")
        const res = await api.get(`/admin/orders/${order.id}/receipts`, { headers: admin.headers })
        expect(res.data).toEqual({
          receipts: [
            {
              id: expect.any(String),
              file_name: "a.png",
              mime_type: "image/png",
              created_at: expect.any(String),
            },
          ],
          note: null,
        })
      })

      it("gives the newest note with its id", async () => {
        await service().createPaymentNotes({ order_id: order.id, note: "Send the rest" })
        const res = await api.get(`/admin/orders/${order.id}/receipts`, { headers: admin.headers })
        expect(res.data.note).toEqual({
          id: expect.stringMatching(/^pnote_/),
          note: "Send the rest",
          created_at: expect.any(String),
        })
      })

      it("sends the private file to an admin", async () => {
        const { id } = await upload(order.id, "bukti transfer é.png")
        const res = await api.get(`/admin/payment-receipts/${id}/file`, {
          headers: admin.headers,
          responseType: "arraybuffer",
        })
        expect(res.headers["content-type"]).toBe("image/png")
        expect(res.headers["cache-control"]).toBe("private, no-store")
        expect(res.headers["x-content-type-options"]).toBe("nosniff")
        expect(res.headers["content-disposition"]).toBe(
          `inline; filename="bukti transfer _.png"; filename*=UTF-8''bukti%20transfer%20%C3%A9.png`
        )
        expect(Buffer.from(res.data)).toEqual(pngBytes)
      })

      it("refuses the list and the file with no admin session", async () => {
        const { id } = await upload(order.id, "a.png")
        const file = await api.get(`/admin/payment-receipts/${id}/file`, {
          headers: storeHeaders,
          validateStatus: () => true,
        })
        expect(file.status).toBe(401)
        const list = await api.get(`/admin/orders/${order.id}/receipts`, {
          headers: storeHeaders,
          validateStatus: () => true,
        })
        expect(list.status).toBe(401)
      })

      it("gives 404 for an unknown receipt and for a missing file", async () => {
        const unknown = await api.get("/admin/payment-receipts/prcpt_none/file", {
          headers: admin.headers,
          validateStatus: () => true,
        })
        expect([unknown.status, unknown.data.message]).toEqual([404, "The receipt does not exist."])

        const { id } = await upload(order.id, "a.png")
        const [row] = await service().listPaymentReceipts({ id })
        await service().removeFile(row.file_key)
        const missing = await api.get(`/admin/payment-receipts/${id}/file`, {
          headers: admin.headers,
          validateStatus: () => true,
        })
        expect(missing.status).toBe(404)
      })
    })

    describe("accept", () => {
      const accept = () =>
        api.post(
          `/admin/orders/${order.id}/receipts/accept`,
          {},
          { headers: admin.headers, validateStatus: () => true }
        )

      it("captures the bank transfer payment", async () => {
        const res = await accept()
        expect([res.status, res.data]).toEqual([200, { captured: true }])
        const [state] = (
          await api.get(`/store/payment-states?order_id=${order.id}`, { headers: storeHeaders })
        ).data.payment_states
        expect(state.captured_at).toEqual(expect.any(String))
      })

      it("refuses a second accept", async () => {
        await accept()
        const res = await accept()
        expect([res.status, res.data.message]).toEqual([
          400,
          "The payment of this order has no amount to capture.",
        ])
      })

      it("refuses a cancelled order", async () => {
        await cancel(order.id)
        const res = await accept()
        expect([res.status, res.data.message]).toEqual([400, "This order is cancelled."])
      })

      it("gives 404 for an unknown order", async () => {
        const res = await api.post(
          "/admin/orders/order_none/receipts/accept",
          {},
          { headers: admin.headers, validateStatus: () => true }
        )
        expect([res.status, res.data.message]).toEqual([404, "The order does not exist."])
      })
    })

    describe("ask for more", () => {
      const ask = (body: object, orderId = order.id) =>
        api.post(`/admin/orders/${orderId}/receipts/ask-for-more`, body, {
          headers: admin.headers,
          validateStatus: () => true,
        })

      it("saves the note, emits the event and moves the order back to waiting", async () => {
        await upload(order.id, "a.png")
        const emit = jest.spyOn(getContainer().resolve(Modules.EVENT_BUS), "emit")
        try {
          const res = await ask({ note: "  Rp 50.000 is missing  " })
          expect(res.status).toBe(200)
          expect(res.data.note).toEqual({
            id: expect.stringMatching(/^pnote_/),
            note: "Rp 50.000 is missing",
            created_at: expect.any(String),
          })
          expect(emit).toHaveBeenCalledWith(
            expect.objectContaining({
              name: "payment_receipt.more_requested",
              data: { order_id: order.id, note_id: res.data.note.id },
            })
          )
        } finally {
          emit.mockRestore()
        }
        const [state] = await service().receiptStates([order.id])
        expect(state.note?.note).toBe("Rp 50.000 is missing")
        expect(new Date(state.note!.created_at).getTime()).toBeGreaterThan(
          new Date(state.receipts[0].created_at).getTime()
        )
      })

      it("works at three receipts", async () => {
        for (const n of ["a", "b", "c"]) await upload(order.id, `${n}.png`)
        expect((await ask({ note: "Send the rest" })).status).toBe(200)
      })

      it.each([
        [{ note: "   " }, "Write a note for the customer."],
        [{ note: "x".repeat(501) }, "Write at most 500 characters."],
      ])("refuses a bad note %#", async (body, message) => {
        const res = await ask(body)
        expect(res.status).toBe(400)
        expect(res.data.message).toContain(message)
      })

      it("refuses an extra field", async () => {
        expect((await ask({ note: "x", order_id: "order_x" })).status).toBe(400)
      })

      it("refuses a captured order", async () => {
        await capture(order.id)
        const res = await ask({ note: "x" })
        expect([res.status, res.data.message]).toEqual([
          400,
          "The store already confirmed the payment of this order.",
        ])
      })

      it("refuses a cancelled order and an unknown order", async () => {
        await cancel(order.id)
        const cancelled = await ask({ note: "x" })
        expect([cancelled.status, cancelled.data.message]).toEqual([
          400,
          "This order is cancelled.",
        ])
        const unknown = await ask({ note: "x" }, "order_none")
        expect([unknown.status, unknown.data.message]).toEqual([404, "The order does not exist."])
      })
    })
  },
})
