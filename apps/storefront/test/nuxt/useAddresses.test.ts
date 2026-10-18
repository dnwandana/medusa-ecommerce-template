import type { HttpTypes } from "@medusajs/types"
import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, useAddresses, useState } from "#imports"
import { type AddressFormValues, toCustomerAddressBody } from "~/utils/addressForm"

const { sdk } = vi.hoisted(() => ({
  sdk: {
    store: {
      customer: {
        listAddress: vi.fn(),
        createAddress: vi.fn(),
        updateAddress: vi.fn(),
        deleteAddress: vi.fn(),
      },
    },
  },
}))

mockNuxtImport("useMedusa", () => () => sdk)

const home = {
  id: "a1",
  address_name: "Rumah",
  is_default_shipping: true,
  created_at: "2026-10-01T00:00:00Z",
}
const office = {
  id: "a2",
  address_name: "Kantor",
  is_default_shipping: false,
  created_at: "2026-10-02T00:00:00Z",
}
const parents = {
  id: "a3",
  address_name: null,
  is_default_shipping: false,
  created_at: "2026-10-03T00:00:00Z",
}

const values: AddressFormValues = {
  address_name: "Kantor",
  full_name: "Sari Dewi",
  phone: "0812 3456 7890",
  address_1: "Jl. Sudirman 1\nLantai 5",
  city: "Jakarta",
  province: "DKI Jakarta",
  postal_code: "10220",
}

const httpError = (status: number) => Object.assign(new Error(), { status })

// The tests need only the fields that the sort and the remove rules read.
function seed(list: object[]): void {
  useState("addresses", () => null).value = list as HttpTypes.StoreCustomerAddress[]
}

const ids = (list: { id: string }[] | null) => list?.map((a) => a.id)

beforeEach(() => {
  clearNuxtState()
  Object.values(sdk.store.customer).forEach((mock) => mock.mockReset())
})

describe("useAddresses", () => {
  it("has no list before the first load", () => {
    expect(useAddresses().addresses.value).toBeNull()
  })

  it("loads up to 100 addresses with the default first", async () => {
    sdk.store.customer.listAddress.mockResolvedValue({ addresses: [office, home] })
    const { load, addresses } = useAddresses()

    await load()

    expect(sdk.store.customer.listAddress).toHaveBeenCalledWith({ limit: 100 })
    expect(ids(addresses.value)).toEqual(["a1", "a2"])
  })

  it("creates an address with the Medusa body and returns the new address", async () => {
    seed([home])
    // The response puts the new address first, so the test finds it by id, not by position.
    sdk.store.customer.createAddress.mockResolvedValue({
      customer: { addresses: [office, home] },
    })
    const { create, addresses } = useAddresses()

    const created = await create(values, false)

    expect(sdk.store.customer.createAddress).toHaveBeenCalledWith(
      toCustomerAddressBody(values, false)
    )
    expect(created.id).toBe("a2")
    expect(ids(addresses.value)).toEqual(["a1", "a2"])
  })

  it("updates an address and keeps the sorted list from the response", async () => {
    seed([home, office])
    sdk.store.customer.updateAddress.mockResolvedValue({
      customer: {
        addresses: [
          { ...home, is_default_shipping: false },
          { ...office, is_default_shipping: true },
        ],
      },
    })
    const { update, addresses } = useAddresses()

    await update("a2", values, true)

    expect(sdk.store.customer.updateAddress).toHaveBeenCalledWith(
      "a2",
      toCustomerAddressBody(values, true)
    )
    expect(ids(addresses.value)).toEqual(["a2", "a1"])
  })

  it("sets the default address with one request", async () => {
    seed([home, office])
    sdk.store.customer.updateAddress.mockResolvedValue({
      customer: {
        addresses: [
          { ...home, is_default_shipping: false },
          { ...office, is_default_shipping: true },
        ],
      },
    })
    const { setDefault, addresses } = useAddresses()

    await setDefault("a2")

    expect(sdk.store.customer.updateAddress).toHaveBeenCalledWith("a2", {
      is_default_shipping: true,
    })
    expect(sdk.store.customer.updateAddress).toHaveBeenCalledTimes(1)
    expect(ids(addresses.value)).toEqual(["a2", "a1"])
  })

  it("makes the next address the default after the default address is deleted", async () => {
    seed([home, office, parents])
    sdk.store.customer.deleteAddress.mockResolvedValue({ id: "a1", deleted: true })
    sdk.store.customer.updateAddress.mockResolvedValue({
      customer: { addresses: [parents, { ...office, is_default_shipping: true }] },
    })
    const { remove, addresses } = useAddresses()

    await remove("a1")

    expect(sdk.store.customer.deleteAddress).toHaveBeenCalledWith("a1")
    expect(sdk.store.customer.updateAddress).toHaveBeenCalledWith("a2", {
      is_default_shipping: true,
    })
    expect(ids(addresses.value)).toEqual(["a2", "a3"])
  })

  it("sends no default request after a delete of an address that is not the default", async () => {
    seed([home, office, parents])
    sdk.store.customer.deleteAddress.mockResolvedValue({ id: "a2", deleted: true })
    const { remove, addresses } = useAddresses()

    await remove("a2")

    expect(sdk.store.customer.updateAddress).not.toHaveBeenCalled()
    expect(ids(addresses.value)).toEqual(["a1", "a3"])
  })

  it("sends no default request after a delete of the only address", async () => {
    seed([home])
    sdk.store.customer.deleteAddress.mockResolvedValue({ id: "a1", deleted: true })
    const { remove, addresses } = useAddresses()

    await remove("a1")

    expect(sdk.store.customer.updateAddress).not.toHaveBeenCalled()
    expect(addresses.value).toEqual([])
  })

  it("reloads the list and resolves when the new default does not save", async () => {
    seed([home, office, parents])
    sdk.store.customer.deleteAddress.mockResolvedValue({ id: "a1", deleted: true })
    sdk.store.customer.updateAddress.mockRejectedValue(httpError(500))
    sdk.store.customer.listAddress.mockResolvedValue({ addresses: [office, parents] })
    const { remove, addresses } = useAddresses()

    await expect(remove("a1")).resolves.toBeUndefined()

    expect(sdk.store.customer.listAddress).toHaveBeenCalledTimes(1)
    expect(ids(addresses.value)).toEqual(["a2", "a3"])
  })

  it("resolves when the new default and the reload both fail", async () => {
    seed([home, office, parents])
    sdk.store.customer.deleteAddress.mockResolvedValue({ id: "a1", deleted: true })
    sdk.store.customer.updateAddress.mockRejectedValue(httpError(500))
    sdk.store.customer.listAddress.mockRejectedValue(httpError(500))
    const { remove, addresses } = useAddresses()

    await expect(remove("a1")).resolves.toBeUndefined()

    expect(ids(addresses.value)).toEqual(["a2", "a3"])
  })

  it("keeps the list when the delete fails", async () => {
    seed([home, office, parents])
    sdk.store.customer.deleteAddress.mockRejectedValue(httpError(500))
    const { remove, addresses } = useAddresses()

    await expect(remove("a1")).rejects.toThrow()

    expect(ids(addresses.value)).toEqual(["a1", "a2", "a3"])
    expect(sdk.store.customer.updateAddress).not.toHaveBeenCalled()
  })
})
