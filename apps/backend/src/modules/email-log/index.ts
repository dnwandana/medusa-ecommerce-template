import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import EmailLogNotificationProviderService from "./service"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [EmailLogNotificationProviderService],
})
