import Medusa from "@medusajs/js-sdk"

const MEDUSA_LOCALES: Record<string, "en-US" | "id-ID"> = {
  en: "en-US",
  id: "id-ID",
}

// Returns the Medusa locale (BCP 47) for a storefront locale. An unknown locale gives English.
export function toMedusaLocale(code: string): "en-US" | "id-ID" {
  return MEDUSA_LOCALES[code] ?? "en-US"
}

// Creates the JS SDK client. The client uses the cookie session and sends the locale header.
// sdk.setLocale works only in the browser. The global header works on the server too.
export function createMedusaClient(options: {
  baseUrl: string
  publishableKey: string
  locale: string
}): Medusa {
  return new Medusa({
    baseUrl: options.baseUrl,
    publishableKey: options.publishableKey,
    auth: { type: "session" },
    globalHeaders: { "x-medusa-locale": toMedusaLocale(options.locale) },
  })
}
