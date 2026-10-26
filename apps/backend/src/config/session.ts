import type { Env } from "./modules"

const DEFAULT_SESSION_TTL_HOURS = 168
const HOUR_MS = 60 * 60 * 1000

// Returns the options of the session cookie. The magic link is the only sign-in for customers, so
// a rolling session keeps a returning customer signed in. Admin users share this setting.
export function buildSessionOptions(env: Env): { ttl: number; rolling: true } {
  const value = env.SESSION_TTL_HOURS
  if (!value) {
    return { ttl: DEFAULT_SESSION_TTL_HOURS * HOUR_MS, rolling: true }
  }
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`SESSION_TTL_HOURS must be a positive whole number of hours. Value: ${value}`)
  }
  return { ttl: Number(value) * HOUR_MS, rolling: true }
}
