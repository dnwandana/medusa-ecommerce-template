import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { cancelOrderWorkflow, capturePaymentWorkflow } from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PAYMENT_RECEIPT_MODULE } from "../../src/modules/payment-receipt"
import type PaymentReceiptModuleService from "../../src/modules/payment-receipt/service"
import { runSeed } from "../../src/seed"
import { placeOrder } from "../helpers/checkout"

jest.setTimeout(180 * 1000)

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// Returns the 8 PNG magic bytes and n more bytes, as base64.
const png = (n: number): string =>
  Buffer.concat([Buffer.from(PNG_MAGIC), Buffer.alloc(n, 1)]).toString("base64")

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/orders/:id/receipts", () => {
      let headers: Record<string, string>
      let order: { id: string }

      const service = (): PaymentReceiptModuleService =>
        getContainer().resolve(PAYMENT_RECEIPT_MODULE)

      const post = (orderId: string, body: object) =>
        api.post(`/store/orders/${orderId}/receipts`, body, {
          headers,
          validateStatus: () => true,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        })

      const receiptCount = (orderId: string) => service().countReceipts(orderId)

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
        const seed = await runSeed(getContainer())
        headers = { "x-publishable-api-key": seed.publishableKey }
        order = await placeOrder({ api, headers, regionId: seed.regionId }, [["TOTE-DEFAULT", 1]])
      })

      // The local receipt storage keeps the files after the database reset. Remove them.
      afterEach(async () => {
        const receipts = await service().listPaymentReceipts({ order_id: order.id })
        await Promise.all(receipts.map((receipt) => service().removeFile(receipt.file_key)))
      })

      it("saves a receipt and gives its summary", async () => {
        const res = await post(order.id, { file_name: "../../bukti.png", content: png(10) })
        expect(res.status).toBe(201)
        expect(res.data.receipt).toEqual({
          id: expect.stringMatching(/^prcpt_/),
          file_name: "bukti.png",
          created_at: expect.any(String),
        })
        const [row] = await service().listPaymentReceipts({ id: res.data.receipt.id })
        expect(row).toMatchObject({ order_id: order.id, mime_type: "image/png", size: 18 })
      })

      it("refuses a PDF with a JPG name", async () => {
        const res = await post(order.id, {
          file_name: "a.jpg",
          content: Buffer.from("%PDF-1.7 x").toString("base64"),
        })
        expect(res.status).toBe(400)
        expect(res.data.message).toBe(
          "This file type is not supported. Choose a JPG, PNG or WebP file."
        )
      })

      it("refuses content that is not base64", async () => {
        const res = await post(order.id, { file_name: "a.png", content: "<html>" })
        expect(res.status).toBe(400)
        expect(res.data.message).toBe(
          "This file type is not supported. Choose a JPG, PNG or WebP file."
        )
      })

      it("refuses a file larger than 5 MB", async () => {
        const res = await post(order.id, { file_name: "big.png", content: png(5 * 1024 * 1024) })
        expect(res.status).toBe(400)
        expect(res.data.message).toBe("The file is larger than 5 MB. Choose a smaller file.")
      })

      it("allows three receipts and refuses the fourth", async () => {
        for (let i = 0; i < 3; i++) {
          expect((await post(order.id, { file_name: `r${i}.png`, content: png(1) })).status).toBe(
            201
          )
        }
        const res = await post(order.id, { file_name: "r4.png", content: png(1) })
        expect(res.status).toBe(400)
        expect(res.data.message).toBe(
          "You uploaded 3 receipts. Contact the store to send another receipt."
        )
      })

      it("keeps the limit when two uploads arrive at the same time", async () => {
        await post(order.id, { file_name: "a.png", content: png(1) })
        await post(order.id, { file_name: "b.png", content: png(1) })
        const results = await Promise.all([
          post(order.id, { file_name: "c.png", content: png(1) }),
          post(order.id, { file_name: "d.png", content: png(1) }),
        ])
        expect(results.map((r) => r.status).sort()).toEqual([201, 400])
        expect(await receiptCount(order.id)).toBe(3)
      })

      it.each([
        ["cancelled", cancel, "This order is cancelled."],
        ["captured", capture, "The store already confirmed the payment of this order."],
      ])("refuses a %s order", async (_name, change, message) => {
        await change(order.id)
        const res = await post(order.id, { file_name: "a.png", content: png(1) })
        expect([res.status, res.data.message]).toEqual([400, message])
      })

      it("gives 404 for an unknown order and 400 for an extra field", async () => {
        const unknown = await post("order_none", { file_name: "a.png", content: png(1) })
        expect([unknown.status, unknown.data.message]).toEqual([404, "The order does not exist."])
        const extra = await post(order.id, { file_name: "a.png", content: png(1), size: 1 })
        expect(extra.status).toBe(400)
      })
    })
  },
})
