import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MayarPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [MayarPaymentProviderService],
})
