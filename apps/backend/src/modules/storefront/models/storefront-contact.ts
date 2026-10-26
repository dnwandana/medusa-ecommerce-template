import { model } from "@medusajs/framework/utils"

// The store contact that the owner sets on Settings → Store. The module keeps one row. A null
// field means that the store has no value for it.
const StorefrontContact = model.define("storefront_contact", {
  id: model.id().primaryKey(),
  email: model.text().nullable(),
  phone: model.text().nullable(),
  whatsapp: model.text().nullable(),
  address: model.text().nullable(),
  social_links: model.json().nullable(),
})

export default StorefrontContact
