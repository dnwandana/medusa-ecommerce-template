import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { EmailLocale } from "../modules/brevo/templates/i18n"

// Returns the storefront base URL without trailing slashes, or null when the config has no value.
export function readStorefrontUrl(scope: MedusaContainer): string | null {
  const config = scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
  const url = config.admin?.storefrontUrl?.trim()
  return url ? url.replace(/\/+$/, "") : null
}

// Builds a storefront link. The Indonesian storefront pages have the prefix /id, and the base
// can end in a slash, so this function makes sure that the link has one slash at each join.
export function storefrontLink(base: string, locale: EmailLocale, path: string): string {
  const prefix = locale === "id-ID" ? "/id" : ""
  const tail = path.startsWith("/") ? path : `/${path}`
  return `${base.replace(/\/+$/, "")}${prefix}${tail}`
}
