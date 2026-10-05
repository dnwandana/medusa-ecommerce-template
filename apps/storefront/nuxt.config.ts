// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["shadcn-nuxt", "@nuxtjs/i18n"],
  css: ["~/assets/css/tailwind.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },
  i18n: {
    strategy: "prefix_except_default",
    defaultLocale: "en",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "id", name: "Bahasa Indonesia", file: "id.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
  },
  // The account pages need the session cookie, which only the browser has.
  routeRules: {
    "/account": { ssr: false },
    "/account/**": { ssr: false },
    "/id/account": { ssr: false },
    "/id/account/**": { ssr: false },
  },
  runtimeConfig: {
    // The URL that the Nuxt server uses to call Medusa. Set it with NUXT_MEDUSA_BACKEND_URL.
    medusaBackendUrl: "http://localhost:9000",
    public: {
      // The URL that the browser uses to call Medusa. Set it with NUXT_PUBLIC_MEDUSA_BACKEND_URL.
      medusaBackendUrl: "http://localhost:9000",
      // Set it with NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.
      medusaPublishableKey: "",
    },
  },
})
