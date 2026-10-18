import { model } from "@medusajs/framework/utils"

// A note from the owner that asks the customer for more payment.
const PaymentNote = model.define("payment_note", {
  id: model.id({ prefix: "pnote" }).primaryKey(),
  order_id: model.text().index(),
  note: model.text(),
})

export default PaymentNote
