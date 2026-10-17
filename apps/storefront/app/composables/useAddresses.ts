import type { HttpTypes } from "@medusajs/types"
import type { Ref } from "vue"
import { type AddressFormValues, sortAddresses, toCustomerAddressBody } from "~/utils/addressForm"

// The Medusa default page is too small for "all addresses". The account page has no pagination.
const ADDRESS_LIMIT = 100

// Returns the saved addresses of the logged-in customer and the functions that change them.
export function useAddresses(): {
  addresses: Ref<HttpTypes.StoreCustomerAddress[] | null>
  load(): Promise<void>
  create(values: AddressFormValues, isDefault: boolean): Promise<HttpTypes.StoreCustomerAddress>
  update(id: string, values: AddressFormValues, isDefault: boolean): Promise<void>
  remove(id: string): Promise<void>
  setDefault(id: string): Promise<void>
} {
  // The Nuxt context is not available after an await. Get the client and the state here.
  const sdk = useMedusa()
  // null means "not loaded". logout of useCustomer sets this state key to null.
  const addresses = useState<HttpTypes.StoreCustomerAddress[] | null>("addresses", () => null)

  async function load(): Promise<void> {
    const { addresses: list } = await sdk.store.customer.listAddress({ limit: ADDRESS_LIMIT })
    addresses.value = sortAddresses(list)
  }

  async function create(
    values: AddressFormValues,
    isDefault: boolean
  ): Promise<HttpTypes.StoreCustomerAddress> {
    // Keep the ids from before the request. The response order does not show the new address.
    const known = new Set((addresses.value ?? []).map((address) => address.id))
    const { customer } = await sdk.store.customer.createAddress(
      toCustomerAddressBody(values, isDefault)
    )
    const list = customer.addresses ?? []
    // If the state was not loaded, more than one id is unknown. The newest of them is the new one.
    const created = sortByNewest(list.filter((address) => !known.has(address.id)))[0]
    if (!created) {
      throw new Error("The new address is not in the response of the create address request.")
    }
    addresses.value = sortAddresses(list)
    return created
  }

  async function update(id: string, values: AddressFormValues, isDefault: boolean): Promise<void> {
    const { customer } = await sdk.store.customer.updateAddress(
      id,
      toCustomerAddressBody(values, isDefault)
    )
    addresses.value = sortAddresses(customer.addresses ?? [])
  }

  async function setDefault(id: string): Promise<void> {
    // Medusa clears the old default when it sets a new one. One request is enough.
    const { customer } = await sdk.store.customer.updateAddress(id, { is_default_shipping: true })
    addresses.value = sortAddresses(customer.addresses ?? [])
  }

  async function remove(id: string): Promise<void> {
    const deleted = addresses.value?.find((address) => address.id === id)
    // A failed delete throws here, before the state changes.
    await sdk.store.customer.deleteAddress(id)
    const remaining = (addresses.value ?? []).filter((address) => address.id !== id)
    addresses.value = remaining

    // Medusa does not select a new default. The next address in the list order becomes the default.
    const next = remaining[0]
    if (!deleted?.is_default_shipping || !next) {
      return
    }
    try {
      await setDefault(next.id)
    } catch {
      // The address is deleted, so the delete succeeded for the customer.
      // A reload shows the real default state. A failed reload keeps the list without the address.
      try {
        await load()
      } catch {
        // The list without the deleted address is still correct.
      }
    }
  }

  return { addresses, load, create, update, remove, setDefault }
}

function sortByNewest(list: HttpTypes.StoreCustomerAddress[]): HttpTypes.StoreCustomerAddress[] {
  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
