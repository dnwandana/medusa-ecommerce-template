import type { HttpTypes } from "@medusajs/types"
import type { ComputedRef, Ref } from "vue"
import { splitFullName } from "~/utils/addressForm"
import { errorStatus } from "~/utils/errorStatus"

// Returns the logged-in customer and the functions for the account.
// The session cookie is httpOnly. Only a request to /store/customers/me shows the login state.
export function useCustomer(): {
  customer: Ref<HttpTypes.StoreCustomer | null>
  loaded: Ref<boolean>
  refresh(): Promise<void>
  ensureLoaded(): Promise<void>
  signInWithToken(token: string): Promise<void>
  needsWelcome: ComputedRef<boolean>
  completeWelcome(fullName: string | null): Promise<void>
  logout(): Promise<void>
  updateProfile(input: { first_name: string; last_name: string; phone: string }): Promise<void>
} {
  // The Nuxt context is not available after an await. Get all composables and states here.
  const sdk = useMedusa()
  const cart = useCart()
  const customer = useState<HttpTypes.StoreCustomer | null>("customer", () => null)
  const loaded = useState("customer-loaded", () => false)
  // Task 16 keeps the wishlist in this state key.
  const wishlist = useState<unknown>("wishlist", () => null)
  // useAddresses keeps the saved addresses in this state key.
  const addresses = useState<unknown>("addresses", () => null)

  async function refresh(): Promise<void> {
    try {
      const { customer: current } = await sdk.store.customer.retrieve()
      customer.value = current
    } catch (error) {
      // A 401 response means that the session is not logged in.
      if (errorStatus(error) !== 401) {
        throw error
      }
      customer.value = null
    }
    loaded.value = true
  }

  async function ensureLoaded(): Promise<void> {
    if (!loaded.value) {
      await refresh()
    }
  }

  // The token of the magic link session goes to the backend one time. The backend answers with
  // the httpOnly session cookie, which replaces the token. The storefront does not keep the token.
  async function signInWithToken(token: string): Promise<void> {
    await sdk.client.fetch("/auth/session", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    })
    await refresh()
    await cart.transferToCustomer()
  }

  // The backend writes welcome_sent_at when it sends the welcome email, after the first sign-in.
  const needsWelcome = computed(
    () => customer.value !== null && !customer.value.metadata?.welcome_sent_at
  )

  // A null or an empty name means that the customer skipped the name step.
  async function completeWelcome(fullName: string | null): Promise<void> {
    const name = fullName?.trim() ?? ""
    await sdk.client.fetch("/store/customers/me/welcome", {
      method: "POST",
      body: name ? splitFullName(name) : {},
    })
    await refresh()
  }

  async function logout(): Promise<void> {
    await sdk.auth.logout()
    customer.value = null
    cart.clear()
    wishlist.value = null
    // The next customer in this tab must not see these addresses. null makes the next page load them.
    addresses.value = null
  }

  async function updateProfile(input: {
    first_name: string
    last_name: string
    phone: string
  }): Promise<void> {
    const { customer: updated } = await sdk.store.customer.update(input)
    customer.value = updated
  }

  return {
    customer,
    loaded,
    refresh,
    ensureLoaded,
    signInWithToken,
    needsWelcome,
    completeWelcome,
    logout,
    updateProfile,
  }
}
