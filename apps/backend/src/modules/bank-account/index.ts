import { Module } from "@medusajs/framework/utils"
import BankAccountModuleService from "./service"

export const BANK_ACCOUNT_MODULE = "bankAccount"

export default Module(BANK_ACCOUNT_MODULE, {
  service: BankAccountModuleService,
})
