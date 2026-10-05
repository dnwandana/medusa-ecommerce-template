import type { Env } from "./modules"

// Returns the driver options for a PostgreSQL service that has no TLS certificate.
// It returns undefined for all other cases, so that Medusa keeps its default.
export function buildDatabaseDriverOptions(
  env: Env
): { ssl: false; sslmode: "disable" } | undefined {
  if (env.DATABASE_SSL !== "false") {
    return undefined
  }
  return { ssl: false, sslmode: "disable" }
}
