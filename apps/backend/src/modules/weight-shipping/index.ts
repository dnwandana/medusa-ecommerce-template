import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import WeightShippingProviderService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [WeightShippingProviderService],
})
