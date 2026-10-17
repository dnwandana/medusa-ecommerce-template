import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import BankTransferProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [BankTransferProviderService],
})
