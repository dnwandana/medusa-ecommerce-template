import { Module } from "@medusajs/framework/utils"
import { PAYMENT_RECEIPT_MODULE } from "./constants"
import PaymentReceiptModuleService from "./service"

export { PAYMENT_RECEIPT_MODULE }

export default Module(PAYMENT_RECEIPT_MODULE, {
  service: PaymentReceiptModuleService,
})
