import type { MedusaContainer } from "@medusajs/framework/types"
import { STOREFRONT_MODULE } from "../modules/storefront"
import type StorefrontModuleService from "../modules/storefront/service"

// Returns the address for the owner emails. The store contact wins because the owner edits it in
// the admin. The env value is the fallback for a store with no contact. An empty string means
// that no address exists, and the caller skips the email.
export async function readOwnerEmail(
  scope: MedusaContainer,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  const storefront: StorefrontModuleService = scope.resolve(STOREFRONT_MODULE)
  const contact = await storefront.getContact()
  return contact.email?.trim() || env.STORE_OWNER_EMAIL?.trim() || ""
}
