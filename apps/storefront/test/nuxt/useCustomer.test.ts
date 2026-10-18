import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, useCustomer, useState } from "#imports"

const { sdk, cart } = vi.hoisted(() => ({
  cart: { transferToCustomer: vi.fn(), clear: vi.fn() },
  sdk: {
    auth: {
      logout: vi.fn(),
    },
    store: {
      customer: { retrieve: vi.fn(), create: vi.fn(), update: vi.fn() },
    },
    client: { fetch: vi.fn() },
  },
}))

mockNuxtImport("useMedusa", () => () => sdk)
mockNuxtImport("useCart", () => () => cart)

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })
const buyer = { id: "cus_1", email: "buyer@example.com", first_name: "Sari", last_name: "Dewi" }

beforeEach(() => {
  clearNuxtState()
  Object.values(sdk.auth).forEach((mock) => mock.mockReset())
  Object.values(sdk.store.customer).forEach((mock) => mock.mockReset())
  cart.transferToCustomer.mockReset().mockResolvedValue(undefined)
  cart.clear.mockReset()
  sdk.client.fetch.mockReset().mockResolvedValue({})
  sdk.store.customer.retrieve.mockResolvedValue({ customer: buyer })
})

describe("useCustomer: login state", () => {
  it("loads the customer of the session", async () => {
    const { refresh, customer, loaded } = useCustomer()

    await refresh()

    expect(customer.value).toEqual(buyer)
    expect(loaded.value).toBe(true)
  })

  it("has no customer when the session is not logged in", async () => {
    sdk.store.customer.retrieve.mockRejectedValue(httpError(401))
    const { refresh, customer, loaded } = useCustomer()

    await expect(refresh()).resolves.toBeUndefined()

    expect(customer.value).toBeNull()
    expect(loaded.value).toBe(true)
  })

  it("throws for an error that is not 401", async () => {
    sdk.store.customer.retrieve.mockRejectedValue(httpError(500))

    await expect(useCustomer().refresh()).rejects.toThrow("HTTP 500")
  })

  it("asks the server one time with ensureLoaded", async () => {
    const { ensureLoaded } = useCustomer()

    await ensureLoaded()
    await ensureLoaded()

    expect(sdk.store.customer.retrieve).toHaveBeenCalledTimes(1)
  })
})

describe("useCustomer: no password sign-in", () => {
  it("has no password functions", () => {
    const api = useCustomer() as Record<string, unknown>
    for (const name of ["login", "register", "requestPasswordReset", "resetPassword"]) {
      expect(api[name]).toBeUndefined()
    }
  })
})

describe("useCustomer: logout and profile", () => {
  it("logs out and clears the customer, the cart, the wishlist, and the addresses", async () => {
    sdk.auth.logout.mockResolvedValue(undefined)
    const wishlist = useState<unknown>("wishlist", () => ({ id: "wl_1", items: [] }))
    const addresses = useState<unknown>("addresses", () => [{ id: "a1" }])
    const { refresh, logout, customer } = useCustomer()
    await refresh()

    await logout()

    expect(sdk.auth.logout).toHaveBeenCalledTimes(1)
    expect(customer.value).toBeNull()
    expect(cart.clear).toHaveBeenCalledTimes(1)
    expect(wishlist.value).toBeNull()
    expect(addresses.value).toBeNull()
  })

  it("saves the profile and updates the customer", async () => {
    sdk.store.customer.update.mockResolvedValue({ customer: { ...buyer, phone: "081234567890" } })
    const { updateProfile, customer } = useCustomer()

    await updateProfile({ first_name: "Sari", last_name: "Dewi", phone: "081234567890" })

    expect(sdk.store.customer.update).toHaveBeenCalledWith({
      first_name: "Sari",
      last_name: "Dewi",
      phone: "081234567890",
    })
    expect(customer.value?.phone).toBe("081234567890")
  })
})

describe("useCustomer: magic link", () => {
  it("turns the token into a session, then loads the customer and moves the cart", async () => {
    const order: string[] = []
    sdk.client.fetch.mockImplementation(async () => {
      order.push("session")
    })
    sdk.store.customer.retrieve.mockImplementation(async () => {
      order.push("retrieve")
      return { customer: buyer }
    })
    cart.transferToCustomer.mockImplementation(async () => {
      order.push("transfer")
    })
    const { signInWithToken, customer } = useCustomer()

    await signInWithToken("jwt_1")

    expect(sdk.client.fetch).toHaveBeenCalledWith("/auth/session", {
      method: "POST",
      headers: { authorization: "Bearer jwt_1" },
    })
    expect(order).toEqual(["session", "retrieve", "transfer"])
    expect(customer.value).toEqual(buyer)
  })

  it("throws and stays signed out when the session call fails", async () => {
    sdk.client.fetch.mockRejectedValue(httpError(401))
    const { signInWithToken, customer } = useCustomer()
    await expect(signInWithToken("bad")).rejects.toThrow("HTTP 401")
    expect(customer.value).toBeNull()
    expect(cart.transferToCustomer).not.toHaveBeenCalled()
  })

  it("needs the welcome step only without welcome_sent_at", async () => {
    const { needsWelcome, customer } = useCustomer()
    expect(needsWelcome.value).toBe(false)
    customer.value = { ...buyer, metadata: null } as any
    expect(needsWelcome.value).toBe(true)
    customer.value = { ...buyer, metadata: { welcome_sent_at: "2026-10-18T07:40:00.000Z" } } as any
    expect(needsWelcome.value).toBe(false)
  })

  it.each([
    ["Muhammad Rizky Pratama", { first_name: "Muhammad Rizky", last_name: "Pratama" }],
    ["  Sari ", { first_name: "Sari", last_name: "" }],
    [null, {}],
    ["   ", {}],
  ])("sends the welcome call for %j", async (name, body) => {
    await useCustomer().completeWelcome(name)
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/customers/me/welcome", {
      method: "POST",
      body,
    })
    expect(sdk.store.customer.retrieve).toHaveBeenCalled()
  })
})
