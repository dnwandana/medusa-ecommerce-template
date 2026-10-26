import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// The development defaults: `medusa develop` listens on port 9000, and Medusa serves the admin at
// "/app" when the config sets no admin path.
const DEFAULT_BACKEND_URL = "http://localhost:9000"
const DEFAULT_ADMIN_PATH = "/app"

// Returns the full URL of an admin page, for example "/orders/order_1". The Medusa default for
// backendUrl is "/", and an email needs a full URL, so "/" gives the localhost default.
export function adminLink(scope: MedusaContainer, path: string): string {
  const configModule = scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const admin = configModule.admin ?? {}
  const base = (admin.backendUrl ?? "").replace(/\/+$/, "") || DEFAULT_BACKEND_URL
  return `${base}${admin.path || DEFAULT_ADMIN_PATH}${path}`
}
