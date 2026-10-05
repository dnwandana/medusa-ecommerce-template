import { model } from "@medusajs/framework/utils"
import Wishlist from "./wishlist"

const WishlistItem = model
  .define("wishlist_item", {
    id: model.id().primaryKey(),
    product_variant_id: model.text(),
    wishlist: model.belongsTo(() => Wishlist, { mappedBy: "items" }),
  })
  // A variant appears one time in a wishlist.
  .indexes([{ on: ["product_variant_id", "wishlist_id"], unique: true }])

export default WishlistItem
