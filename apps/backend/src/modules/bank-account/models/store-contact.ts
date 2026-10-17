import { model } from "@medusajs/framework/utils"

// The contact that the customer uses for questions about a bank transfer.
const StoreContact = model.define("store_contact", {
  id: model.id().primaryKey(),
  email: model.text().nullable(),
  whatsapp: model.text().nullable(),
})

export default StoreContact
