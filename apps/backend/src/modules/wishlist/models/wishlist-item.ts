import { model } from "@medusajs/framework/utils"
import Wishlist from "./wishlist"

const WishlistItem = model
  .define("wishlist_item", {
    id: model.id().primaryKey(),
    product_variant_id: model.text(),
    // The price drop job compares the current price with this price. Null means not read yet.
    saved_unit_price: model.number().nullable(),
    // The back in stock alert goes out only when this value changes from false to true.
    available: model.boolean().default(true),
    // The back in stock alert skips an item with an alert in the last 24 hours.
    alerted_at: model.dateTime().nullable(),
    wishlist: model.belongsTo(() => Wishlist, { mappedBy: "items" }),
  })
  // A variant appears one time in a wishlist.
  .indexes([{ on: ["product_variant_id", "wishlist_id"], unique: true }])

export default WishlistItem
