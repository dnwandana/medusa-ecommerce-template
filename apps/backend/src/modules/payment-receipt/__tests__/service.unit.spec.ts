import PaymentReceiptModuleService from "../service"

const proto = PaymentReceiptModuleService.prototype as any
const at = (s: string) => new Date(`2026-10-18T${s}:00Z`)

it("gives one state for each order, in the input order", async () => {
  const self = {
    listPaymentReceipts: jest.fn().mockResolvedValue([
      {
        id: "prcpt_2",
        order_id: "order_1",
        file_name: "b.png",
        mime_type: "image/png",
        created_at: at("02:00"),
      },
      {
        id: "prcpt_1",
        order_id: "order_1",
        file_name: "a.jpg",
        mime_type: "image/jpeg",
        created_at: at("01:00"),
      },
    ]),
    listPaymentNotes: jest.fn().mockResolvedValue([
      { id: "pnote_1", order_id: "order_1", note: "Rp 50.000 is missing", created_at: at("03:00") },
      { id: "pnote_0", order_id: "order_1", note: "old", created_at: at("00:30") },
    ]),
  }
  const states = await proto.receiptStates.call(self, ["order_2", "order_1"])
  expect(states[0]).toEqual({ order_id: "order_2", receipts: [], note: null })
  expect(states[1].receipts.map((r: { id: string }) => r.id)).toEqual(["prcpt_1", "prcpt_2"])
  expect(states[1].note).toEqual({
    id: "pnote_1",
    note: "Rp 50.000 is missing",
    created_at: at("03:00"),
  })
  expect(states[1].receipts[0]).not.toHaveProperty("file_key")
  expect(states[1].receipts[0]).not.toHaveProperty("order_id")
  expect(self.listPaymentReceipts).toHaveBeenCalledTimes(1)
  expect(self.listPaymentNotes).toHaveBeenCalledTimes(1)
  expect(self.listPaymentReceipts.mock.calls[0][0]).toEqual({ order_id: ["order_2", "order_1"] })
})

it("gives an empty list for no ids, with no query", async () => {
  const self = { listPaymentReceipts: jest.fn(), listPaymentNotes: jest.fn() }
  expect(await proto.receiptStates.call(self, [])).toEqual([])
  expect(self.listPaymentReceipts).not.toHaveBeenCalled()
})

it("counts the receipts of one order", async () => {
  const self = { listPaymentReceipts: jest.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]) }
  expect(await proto.countReceipts.call(self, "order_1")).toBe(2)
  expect(self.listPaymentReceipts).toHaveBeenCalledWith({ order_id: "order_1" }, { select: ["id"] })
})

it("sends the file calls to the storage", async () => {
  const storage = {
    put: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(Buffer.from("x")),
    remove: jest.fn().mockResolvedValue(undefined),
  }
  const self = { storage_: storage }
  await proto.putFile.call(self, "order_1/prcpt_1.png", Buffer.from("x"), "image/png")
  expect(storage.put).toHaveBeenCalledWith("order_1/prcpt_1.png", Buffer.from("x"), "image/png")
  expect((await proto.getFile.call(self, "order_1/prcpt_1.png"))?.toString()).toBe("x")
  await proto.removeFile.call(self, "order_1/prcpt_1.png")
  expect(storage.remove).toHaveBeenCalledWith("order_1/prcpt_1.png")
})
