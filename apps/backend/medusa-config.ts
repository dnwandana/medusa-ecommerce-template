import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { buildDatabaseDriverOptions } from "./src/config/database"
import { buildModules } from "./src/config/modules"
import { buildSessionOptions } from "./src/config/session"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: buildDatabaseDriverOptions(process.env),
    // The session store uses this URL. The modules get their URL from buildModules.
    redisUrl: process.env.REDIS_URL || undefined,
    workerMode: (process.env.MEDUSA_WORKER_MODE || "shared") as "shared" | "worker" | "server",
    sessionOptions: buildSessionOptions(process.env),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      // Customers sign in only through the magic link routes. Admin users keep the password.
      authMethodsPerActor: { user: ["emailpass"], customer: [] },
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    storefrontUrl: process.env.STOREFRONT_URL,
  },
  modules: buildModules(process.env),
  featureFlags: {
    // The Translation Module needs this flag in Medusa 2.21.
    translation: true,
  },
})
