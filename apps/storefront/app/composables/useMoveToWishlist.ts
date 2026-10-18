import type { HttpTypes } from "@medusajs/types"
import { toast } from "vue-sonner"
import { signInTarget } from "~/utils/authPaths"

// Returns the function that moves a cart line to the wishlist of the customer.
export function useMoveToWishlist(): {
  move(item: HttpTypes.StoreCartLineItem): Promise<"moved" | "signIn">
} {
  // The Nuxt context is not available after an await. Get all composables here.
  const { customer, ensureLoaded } = useCustomer()
  const wishlist = useWishlist()
  const { removeItem } = useCart()
  const { t } = useI18n()
  const localePath = useLocalePath()

  async function move(item: HttpTypes.StoreCartLineItem): Promise<"moved" | "signIn"> {
    await ensureLoaded()
    // Only a customer has a wishlist. The cart does not change for a guest.
    if (!customer.value) {
      await navigateTo(localePath(signInTarget("/cart")))
      return "signIn"
    }
    if (!item.variant_id) {
      throw new Error("The cart line has no variant. Remove the line from the cart.")
    }

    if (wishlist.wishlist.value === null) {
      await wishlist.load()
    }
    // The line stays in the cart until the wishlist has the variant.
    if (!wishlist.itemFor(item.variant_id)) {
      await wishlist.add(item.variant_id)
    }
    await removeItem(item.id)

    toast.success(t("cart.movedToWishlist"), {
      action: {
        label: t("cart.viewWishlist"),
        onClick: () => navigateTo(localePath("/account/wishlist")),
      },
    })
    return "moved"
  }

  return { move }
}
