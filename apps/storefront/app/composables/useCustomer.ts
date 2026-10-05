import type { HttpTypes } from "@medusajs/types"
import type { Ref } from "vue"
import { errorStatus } from "~/utils/errorStatus"

// Returns the logged-in customer and the functions for the account.
// The session cookie is httpOnly. Only a request to /store/customers/me shows the login state.
export function useCustomer(): {
  customer: Ref<HttpTypes.StoreCustomer | null>
  loaded: Ref<boolean>
  refresh(): Promise<void>
  ensureLoaded(): Promise<void>
  register(input: {
    email: string
    password: string
    first_name: string
    last_name: string
  }): Promise<void>
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  updateProfile(input: { first_name: string; last_name: string; phone: string }): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  resetPassword(input: { email: string; password: string; token: string }): Promise<void>
} {
  // The Nuxt context is not available after an await. Get all composables and states here.
  const sdk = useMedusa()
  const cart = useCart()
  const customer = useState<HttpTypes.StoreCustomer | null>("customer", () => null)
  const loaded = useState("customer-loaded", () => false)
  // Task 16 keeps the wishlist in this state key.
  const wishlist = useState<unknown>("wishlist", () => null)

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

  async function login(email: string, password: string): Promise<void> {
    const result = await sdk.auth.login("customer", "emailpass", { email, password })
    // A result that is not a token is a redirect to a third-party provider.
    if (typeof result !== "string") {
      throw new Error("This login method is not supported.")
    }
    await refresh()
    await cart.transferToCustomer()
  }

  async function register(input: {
    email: string
    password: string
    first_name: string
    last_name: string
  }): Promise<void> {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: input.email,
      password: input.password,
    })
    // In session mode, the SDK does not send the registration token. Send it for this request only.
    await sdk.store.customer.create(
      { email: input.email, first_name: input.first_name, last_name: input.last_name },
      {},
      { authorization: `Bearer ${token}` }
    )
    await login(input.email, input.password)
  }

  async function logout(): Promise<void> {
    await sdk.auth.logout()
    customer.value = null
    cart.clear()
    wishlist.value = null
  }

  async function updateProfile(input: {
    first_name: string
    last_name: string
    phone: string
  }): Promise<void> {
    const { customer: updated } = await sdk.store.customer.update(input)
    customer.value = updated
  }

  async function requestPasswordReset(email: string): Promise<void> {
    try {
      await sdk.auth.resetPassword("customer", "emailpass", { identifier: email })
    } catch {
      // The page shows the same message for a known and an unknown address.
    }
  }

  async function resetPassword(input: {
    email: string
    password: string
    token: string
  }): Promise<void> {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      { email: input.email, password: input.password },
      input.token
    )
  }

  return {
    customer,
    loaded,
    refresh,
    ensureLoaded,
    register,
    login,
    logout,
    updateProfile,
    requestPasswordReset,
    resetPassword,
  }
}
