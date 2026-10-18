import { model } from "@medusajs/framework/utils"

// A proof of payment that the customer uploaded for a bank transfer order. The file is in the
// receipt storage at file_key. The order_id column is the link to the order.
const PaymentReceipt = model.define("payment_receipt", {
  id: model.id({ prefix: "prcpt" }).primaryKey(),
  order_id: model.text().index(),
  file_key: model.text(),
  file_name: model.text(),
  mime_type: model.text(),
  size: model.number(),
})

export default PaymentReceipt
