import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

// A link expires 15 minutes after the request.
export const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000

// One email address gets at most one link in 60 seconds.
export const MAGIC_LINK_RESEND_MS = 60 * 1000

// After "Yes, sign me in" on the other device, the original tab has 5 minutes to take the
// session.
export const MAGIC_LINK_CONFIRM_WINDOW_MS = 5 * 60 * 1000

// Returns 32 random bytes as base64url (43 characters). The token of the link and the secret of
// the browser both use it.
export function createRandomToken(): string {
  return randomBytes(32).toString("base64url")
}

// Returns the SHA-256 hash as 64 hexadecimal characters.
export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

// Returns true when the hash of the value is the stored hash. The compare runs in constant
// time. A bad input gives false and does not throw.
export function tokenMatches(value: string, hash: string): boolean {
  if (typeof value !== "string" || value === "" || typeof hash !== "string") return false
  const actual = Buffer.from(hashToken(value), "utf8")
  const expected = Buffer.from(hash, "utf8")
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
