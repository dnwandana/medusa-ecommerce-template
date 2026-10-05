import type Medusa from "@medusajs/js-sdk"

// Returns a JS SDK client for the active locale. The Nuxt server uses the internal URL of
// Medusa, and the browser uses the public URL.
export function useMedusa(): Medusa {
  const config = useRuntimeConfig()
  const baseUrl = import.meta.server ? config.medusaBackendUrl : config.public.medusaBackendUrl
  const locale = useNuxtApp().$i18n.locale.value

  return createMedusaClient({
    baseUrl,
    publishableKey: config.public.medusaPublishableKey,
    locale,
  })
}
