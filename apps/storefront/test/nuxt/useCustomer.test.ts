import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, useCustomer, useState } from "#imports"

const { sdk, cart } = vi.hoisted(() => ({
  cart: { transferToCustomer: vi.fn(), clear: vi.fn() },
  sdk: {
    auth: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      resetPassword: vi.fn(),
      updateProvider: vi.fn(),
    },
    store: {
      customer: { retrieve: vi.fn(), create: vi.fn(), update: vi.fn() },
    },
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

describe("useCustomer: register and login", () => {
  it("logs in, loads the customer, and transfers the cart", async () => {
    sdk.auth.login.mockResolvedValue("jwt_token")
    const { login, customer } = useCustomer()

    await login("buyer@example.com", "secret-password")

    expect(sdk.auth.login).toHaveBeenCalledWith("customer", "emailpass", {
      email: "buyer@example.com",
      password: "secret-password",
    })
    expect(customer.value).toEqual(buyer)
    expect(cart.transferToCustomer).toHaveBeenCalledTimes(1)
  })

  it("rejects a login result that is not a token", async () => {
    sdk.auth.login.mockResolvedValue({ location: "https://provider.example" })

    await expect(useCustomer().login("buyer@example.com", "pw")).rejects.toThrow(
      "This login method is not supported."
    )
    expect(sdk.store.customer.retrieve).not.toHaveBeenCalled()
  })

  it("registers the identity, creates the customer with the token, and logs in", async () => {
    sdk.auth.register.mockResolvedValue("registration_token")
    sdk.store.customer.create.mockResolvedValue({ customer: buyer })
    sdk.auth.login.mockResolvedValue("jwt_token")
    const { register, customer } = useCustomer()

    await register({
      email: "buyer@example.com",
      password: "secret-password",
      first_name: "Sari",
      last_name: "Dewi",
    })

    expect(sdk.auth.register).toHaveBeenCalledWith("customer", "emailpass", {
      email: "buyer@example.com",
      password: "secret-password",
    })
    expect(sdk.store.customer.create).toHaveBeenCalledWith(
      { email: "buyer@example.com", first_name: "Sari", last_name: "Dewi" },
      {},
      { authorization: "Bearer registration_token" }
    )
    expect(sdk.auth.login).toHaveBeenCalledTimes(1)
    expect(customer.value).toEqual(buyer)
  })

  it("creates no customer when the registration fails", async () => {
    sdk.auth.register.mockRejectedValue(httpError(401))

    await expect(
      useCustomer().register({
        email: "buyer@example.com",
        password: "secret-password",
        first_name: "Sari",
        last_name: "Dewi",
      })
    ).rejects.toThrow("HTTP 401")
    expect(sdk.store.customer.create).not.toHaveBeenCalled()
  })
})

describe("useCustomer: logout, profile, and password", () => {
  it("logs out and clears the customer, the cart, and the wishlist", async () => {
    sdk.auth.logout.mockResolvedValue(undefined)
    const wishlist = useState<unknown>("wishlist", () => ({ id: "wl_1", items: [] }))
    const { refresh, logout, customer } = useCustomer()
    await refresh()

    await logout()

    expect(sdk.auth.logout).toHaveBeenCalledTimes(1)
    expect(customer.value).toBeNull()
    expect(cart.clear).toHaveBeenCalledTimes(1)
    expect(wishlist.value).toBeNull()
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

  it("requests a password reset for the email address", async () => {
    sdk.auth.resetPassword.mockResolvedValue(undefined)

    await useCustomer().requestPasswordReset("buyer@example.com")

    expect(sdk.auth.resetPassword).toHaveBeenCalledWith("customer", "emailpass", {
      identifier: "buyer@example.com",
    })
  })

  it("does not show whether the reset request failed", async () => {
    sdk.auth.resetPassword.mockRejectedValue(httpError(404))

    await expect(useCustomer().requestPasswordReset("nobody@example.com")).resolves.toBeUndefined()
  })

  it("sets the new password with the token of the email", async () => {
    sdk.auth.updateProvider.mockResolvedValue(undefined)

    await useCustomer().resetPassword({
      email: "buyer@example.com",
      password: "new-password",
      token: "reset_token",
    })

    expect(sdk.auth.updateProvider).toHaveBeenCalledWith(
      "customer",
      "emailpass",
      { email: "buyer@example.com", password: "new-password" },
      "reset_token"
    )
  })
})
