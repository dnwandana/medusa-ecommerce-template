import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useBankTransfer } from "#imports"

const { sdk } = vi.hoisted(() => ({ sdk: { client: { fetch: vi.fn() } } }))

mockNuxtImport("useMedusa", () => () => sdk)

const account = {
  id: "ba_1",
  bank_name: "Sample Bank",
  account_number: "1234567890",
  account_holder: "Sample Store",
}

beforeEach(() => {
  sdk.client.fetch.mockReset()
})

describe("useBankTransfer", () => {
  it("gets the accounts and the contact from the Store API", async () => {
    sdk.client.fetch.mockResolvedValue({
      bank_accounts: [account],
      contact: { email: null, whatsapp: null },
    })

    expect(await useBankTransfer().getDetails()).toEqual({
      bank_accounts: [account],
      contact: { email: null, whatsapp: null },
    })
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/bank-transfer")
  })
})
