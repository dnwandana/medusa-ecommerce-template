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
  it("gets the accounts, the switch, and the deadline from the Store API", async () => {
    const response = { bank_accounts: [account], enabled: true, deadline_hours: 24 }
    sdk.client.fetch.mockResolvedValue(response)

    expect(await useBankTransfer().getDetails()).toEqual(response)
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/bank-transfer")
  })
})
