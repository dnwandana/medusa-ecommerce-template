import { model } from "@medusajs/framework/utils"
import WishlistItem from "./wishlist-item"

const Wishlist = model
  .define("wishlist", {
    id: model.id().primaryKey(),
    customer_id: model.text(),
    items: model.hasMany(() => WishlistItem, { mappedBy: "wishlist" }),
  })
  // Each customer has one wishlist.
  .indexes([{ on: ["customer_id"], unique: true }])
  .cascades({ delete: ["items"] })

export default Wishlist
