import { model } from "@medusajs/framework/utils"

// A colour of the store. The storefront shows its hex as the dot of a colour option value when
// the product has no hex of its own.
const StoreColour = model.define("store_colour", {
  id: model.id().primaryKey(),
  name: model.text(),
  hex: model.text(),
})

export default StoreColour
