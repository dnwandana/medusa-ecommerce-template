import Medusa from "@medusajs/js-sdk"

// The admin dashboard and the API have the same origin, so the base URL is "/".
export const sdk = new Medusa({
  baseUrl: "/",
  debug: import.meta.env.DEV,
  auth: { type: "session" },
})
