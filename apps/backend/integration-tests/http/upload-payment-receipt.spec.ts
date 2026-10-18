import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { PAYMENT_RECEIPT_MODULE } from "../../src/modules/payment-receipt"
import type PaymentReceiptModuleService from "../../src/modules/payment-receipt/service"
import { uploadPaymentReceiptWorkflow } from "../../src/workflows/upload-payment-receipt"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("uploadPaymentReceiptWorkflow", () => {
      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
      const input = {
        order_id: "order_test",
        file_name: "bukti.png",
        mime_type: "image/png" as const,
        content: png.toString("base64"),
      }

      it("keeps the file and the row and gives the summary", async () => {
        const { result } = await uploadPaymentReceiptWorkflow(getContainer()).run({ input })
        const service: PaymentReceiptModuleService = getContainer().resolve(PAYMENT_RECEIPT_MODULE)
        const [row] = await service.listPaymentReceipts({ id: result.id })
        try {
          expect(row).toMatchObject({
            order_id: "order_test",
            file_key: `order_test/${result.id}.png`,
            file_name: "bukti.png",
            mime_type: "image/png",
            size: png.length,
          })
          expect(await service.getFile(row.file_key)).toEqual(png)
          // The engine sends the workflow result through JSON, so the date is an ISO string.
          expect(result).toEqual({
            id: row.id,
            file_name: "bukti.png",
            created_at: new Date(row.created_at).toISOString(),
          })
        } finally {
          await service.removeFile(row.file_key)
        }
      })

      it("removes the file when the row fails", async () => {
        const service: PaymentReceiptModuleService = getContainer().resolve(PAYMENT_RECEIPT_MODULE)
        const spy = jest
          .spyOn(service, "createPaymentReceipts")
          .mockRejectedValueOnce(new Error("db down"))
        const removeSpy = jest.spyOn(service, "removeFile")
        try {
          const { errors } = await uploadPaymentReceiptWorkflow(getContainer()).run({
            input,
            throwOnError: false,
          })
          expect(errors).toHaveLength(1)
          expect(removeSpy).toHaveBeenCalledWith(
            expect.stringMatching(/^order_test\/prcpt_.+\.png$/)
          )
          const key = removeSpy.mock.calls[0][0]
          expect(await service.getFile(key)).toBeNull()
        } finally {
          spy.mockRestore()
          removeSpy.mockRestore()
        }
      })
    })
  },
})
