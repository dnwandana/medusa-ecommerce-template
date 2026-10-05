import type { Ref } from "vue"
import { errorStatus } from "~/utils/errorStatus"

export type WishlistItem = {
  id: string
  product_variant_id: string
  product_variant: {
    id: string
    title: string
    sku: string | null
    calculated_price: { calculated_amount: number | null } | null
    product: { id: string; title: string; handle: string; thumbnail: string | null }
  }
}

export type Wishlist = { id: string | null; items: WishlistItem[] }

// Returns the wishlist of the logged-in customer and the functions that change it.
export function useWishlist(): {
  wishlist: Ref<Wishlist | null>
  load(): Promise<void>
  add(variantId: string): Promise<void>
  remove(itemId: string): Promise<void>
  itemFor(variantId: string): WishlistItem | undefined
} {
  // The Nuxt context is not available after an await. Get the client and the state here.
  const sdk = useMedusa()
  // logout of useCustomer sets this state key to null.
  const wishlist = useState<Wishlist | null>("wishlist", () => null)

  async function load(): Promise<void> {
    try {
      const { wishlist: current } = await sdk.client.fetch<{ wishlist: Wishlist }>(
        "/store/customers/me/wishlist"
      )
      wishlist.value = current
    } catch (error) {
      // A 401 response means that the session is not logged in.
      if (errorStatus(error) !== 401) {
        throw error
      }
      wishlist.value = null
    }
  }

  async function add(variantId: string): Promise<void> {
    await sdk.client.fetch("/store/customers/me/wishlist/items", {
      method: "POST",
      body: { variant_id: variantId },
    })
    // The POST response has no product data. The reload gets it.
    await load()
  }

  async function remove(itemId: string): Promise<void> {
    await sdk.client.fetch(`/store/customers/me/wishlist/items/${itemId}`, { method: "DELETE" })
    if (wishlist.value) {
      wishlist.value = {
        ...wishlist.value,
        items: wishlist.value.items.filter((entry) => entry.id !== itemId),
      }
    }
  }

  function itemFor(variantId: string): WishlistItem | undefined {
    return wishlist.value?.items.find((entry) => entry.product_variant_id === variantId)
  }

  return { wishlist, load, add, remove, itemFor }
}
