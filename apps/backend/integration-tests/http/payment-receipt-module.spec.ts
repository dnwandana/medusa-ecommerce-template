import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PAYMENT_RECEIPT_MODULE } from "../../src/modules/payment-receipt"
import PaymentReceiptModuleService from "../../src/modules/payment-receipt/service"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("payment receipt module storage", () => {
      let service: PaymentReceiptModuleService

      beforeEach(() => {
        service = getContainer().resolve(PAYMENT_RECEIPT_MODULE)
      })

      it("stores receipts and notes and gives the state of each order", async () => {
        const receipt = await service.createPaymentReceipts({
          order_id: "order_x",
          file_key: "order_x/prcpt_test.png",
          file_name: "bukti.png",
          mime_type: "image/png",
          size: 3,
        })
        expect(receipt.id).toMatch(/^prcpt_/)
        const note = await service.createPaymentNotes({ order_id: "order_x", note: "More, please" })
        expect(note.id).toMatch(/^pnote_/)

        const [state, empty] = await service.receiptStates(["order_x", "order_y"])
        expect(state.order_id).toBe("order_x")
        expect(state.receipts).toHaveLength(1)
        expect(state.receipts[0]).toMatchObject({ id: receipt.id, file_name: "bukti.png" })
        expect(state.receipts[0]).not.toHaveProperty("file_key")
        expect(state.note).toMatchObject({ id: note.id, note: "More, please" })
        expect(empty).toEqual({ order_id: "order_y", receipts: [], note: null })
        expect(await service.countReceipts("order_x")).toBe(1)
      })

      it("writes a file and reads it back from the local storage", async () => {
        const key = `order_test/prcpt_${Date.now()}.png`
        await service.putFile(key, Buffer.from("png"), "image/png")
        try {
          expect((await service.getFile(key))?.toString()).toBe("png")
        } finally {
          await service.removeFile(key)
        }
        expect(await service.getFile(key)).toBeNull()
      })
    })
  },
})
