import { model } from "@medusajs/framework/utils"

// The storefront settings that staff set in the admin. The module keeps one row. A null field
// means that the storefront uses the default value.
const StorefrontSetting = model.define("storefront_setting", {
  id: model.id().primaryKey(),
  new_badge_days: model.number().nullable(),
  low_stock_threshold: model.number().nullable(),
  price_limits: model.json().nullable(),
})

export default StorefrontSetting
