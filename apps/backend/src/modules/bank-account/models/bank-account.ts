import { model } from "@medusajs/framework/utils"

// A bank account that the customer pays to for a bank transfer order.
const BankAccount = model.define("bank_account", {
  id: model.id().primaryKey(),
  bank_name: model.text(),
  account_number: model.text(),
  account_holder: model.text(),
  is_active: model.boolean().default(true),
  rank: model.number().default(0),
})

export default BankAccount
