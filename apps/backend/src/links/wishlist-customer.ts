import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import WishlistModule from "../modules/wishlist"

// Read-only link. The column customer_id of the wishlist holds the customer id.
export default defineLink(
  {
    linkable: WishlistModule.linkable.wishlist.id,
    field: "customer_id",
  },
  CustomerModule.linkable.customer.id,
  { readOnly: true }
)
