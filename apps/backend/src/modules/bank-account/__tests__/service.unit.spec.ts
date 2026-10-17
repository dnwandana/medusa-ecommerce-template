import BankAccountModuleService from "../service"

const proto = BankAccountModuleService.prototype as any

describe("bank account service", () => {
  it("has the generated methods for bank accounts and the store contact", () => {
    for (const name of [
      "createBankAccounts",
      "listBankAccounts",
      "updateBankAccounts",
      "deleteBankAccounts",
      "createStoreContacts",
      "listStoreContacts",
      "updateStoreContacts",
    ]) {
      expect(typeof proto[name]).toBe("function")
    }
  })

  it("returns empty contact values when there is no contact row", async () => {
    const self = { listStoreContacts: jest.fn().mockResolvedValue([]) }
    expect(await proto.getContact.call(self)).toEqual({ email: null, whatsapp: null })
  })

  it("creates the contact row when there is none", async () => {
    const values = { email: "store@example.com", whatsapp: "+6281234567890" }
    const self = {
      listStoreContacts: jest.fn().mockResolvedValue([]),
      createStoreContacts: jest.fn().mockResolvedValue({ id: "sc_1", ...values }),
    }
    expect(await proto.setContact.call(self, values)).toEqual(values)
    expect(self.createStoreContacts).toHaveBeenCalledWith(values)
  })

  it("updates the one contact row when it exists", async () => {
    const values = { email: null, whatsapp: "+6281234567890" }
    const self = {
      listStoreContacts: jest
        .fn()
        .mockResolvedValue([{ id: "sc_1", email: "a@b.c", whatsapp: null }]),
      updateStoreContacts: jest.fn().mockResolvedValue({ id: "sc_1", ...values }),
    }
    expect(await proto.setContact.call(self, values)).toEqual(values)
    expect(self.updateStoreContacts).toHaveBeenCalledWith({ id: "sc_1", ...values })
  })

  it("reads the oldest contact row when it reads and saves the contact", async () => {
    const self = {
      listStoreContacts: jest.fn().mockResolvedValue([{ id: "sc_1", email: null, whatsapp: null }]),
      updateStoreContacts: jest.fn().mockResolvedValue({ id: "sc_1", email: null, whatsapp: null }),
    }
    await proto.getContact.call(self)
    await proto.setContact.call(self, { email: null, whatsapp: null })
    for (const call of self.listStoreContacts.mock.calls) {
      expect(call).toEqual([{}, { take: 1, order: { created_at: "ASC" } }])
    }
  })
})
