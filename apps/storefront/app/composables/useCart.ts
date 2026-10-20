import type { HttpTypes } from "@medusajs/types"
import type { ComputedRef, Ref } from "vue"
import { errorStatus } from "~/utils/errorStatus"
import { toMedusaLocale } from "~/utils/medusaClient"

// Returns the cart of the visitor and the functions that change it.
export function useCart(): {
  cart: Ref<HttpTypes.StoreCart | null>
  itemCount: ComputedRef<number>
  load(): Promise<void>
  add(variantId: string, quantity?: number): Promise<void>
  updateItem(lineItemId: string, quantity: number): Promise<void>
  removeItem(lineItemId: string): Promise<void>
  transferToCustomer(): Promise<void>
  clear(): void
} {
  // The Nuxt context is not available after an await. Get all composables here.
  const sdk = useMedusa()
  const cartId = useCartId()
  const { ensureRegion } = useRegion()
  // useI18n() needs a component setup, but the auth middleware calls this composable. The Nuxt
  // app gives the locale without a component.
  const i18n = useNuxtApp().$i18n
  const cart = useState<HttpTypes.StoreCart | null>("cart", () => null)

  const itemCount = computed(() =>
    (cart.value?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
  )

  function clear(): void {
    cartId.value = null
    cart.value = null
  }

  function requireCartId(): string {
    if (!cartId.value) {
      throw new Error("The visitor has no cart. Add an item first.")
    }
    return cartId.value
  }

  async function load(): Promise<void> {
    const id = cartId.value
    if (!id) {
      return
    }

    try {
      const { cart: loaded } = await sdk.store.cart.retrieve(id)
      // A complete cart is an order. The visitor needs a new cart.
      if (loaded.completed_at) {
        clear()
        return
      }
      cart.value = loaded
    } catch (error) {
      // The cookie points to a cart that does not exist. Remove the cookie.
      if (errorStatus(error) === 404) {
        clear()
        return
      }
      throw error
    }
  }

  async function add(variantId: string, quantity = 1): Promise<void> {
    if (cartId.value && !cart.value) {
      await load()
    }

    if (!cartId.value) {
      const region = await ensureRegion()
      // The cart locale makes the order and the order emails follow the storefront language.
      const { cart: created } = await sdk.store.cart.create({
        region_id: region.id,
        locale: toMedusaLocale(i18n.locale.value),
      })
      cartId.value = created.id
      cart.value = created
    }

    const { cart: updated } = await sdk.store.cart.createLineItem(requireCartId(), {
      variant_id: variantId,
      quantity,
    })
    cart.value = updated
  }

  async function removeItem(lineItemId: string): Promise<void> {
    await sdk.store.cart.deleteLineItem(requireCartId(), lineItemId)
    await load()
  }

  async function updateItem(lineItemId: string, quantity: number): Promise<void> {
    if (quantity < 1) {
      await removeItem(lineItemId)
      return
    }

    const { cart: updated } = await sdk.store.cart.updateLineItem(requireCartId(), lineItemId, {
      quantity,
    })
    cart.value = updated
  }

  async function transferToCustomer(): Promise<void> {
    const id = cartId.value
    if (!id) {
      return
    }

    try {
      const { cart: transferred } = await sdk.store.cart.transferCart(id)
      cart.value = transferred
    } catch {
      // A failed transfer must not stop the login. The cart stays a guest cart.
    }
  }

  return { cart, itemCount, load, add, updateItem, removeItem, transferToCustomer, clear }
}
