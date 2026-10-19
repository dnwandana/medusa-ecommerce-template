// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite"
import { storefrontRouteRules } from "./app/utils/routeRules"

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["shadcn-nuxt", "@nuxtjs/i18n", "@nuxt/eslint"],
  css: ["~/assets/css/tailwind.css"],
  app: {
    head: {
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
      meta: [{ name: "theme-color", content: "#f4f1eb" }],
    },
  },
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
      { code: "en", language: "en-US", name: "English", file: "en.json" },
      { code: "id", language: "id-ID", name: "Bahasa Indonesia", file: "id.json" },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
  },
  routeRules: storefrontRouteRules(),
  runtimeConfig: {
    // The URL that the Nuxt server uses to call Medusa. Set it with NUXT_MEDUSA_BACKEND_URL.
    medusaBackendUrl: "http://localhost:9000",
    public: {
      // The URL that the browser uses to call Medusa. Set it with NUXT_PUBLIC_MEDUSA_BACKEND_URL.
      medusaBackendUrl: "http://localhost:9000",
      // Set it with NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.
      medusaPublishableKey: "",
      // The public origin of the storefront, with no trailing slash.
      // Set it with NUXT_PUBLIC_SITE_URL.
      siteUrl: "http://localhost:3000",
    },
  },
})
