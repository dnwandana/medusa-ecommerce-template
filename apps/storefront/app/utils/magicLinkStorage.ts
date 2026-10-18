// The browser keeps the sign-in request here. localStorage is shared by all the tabs of the
// browser, so the verify tab reads the secret of the original tab. The record holds no token.
// Only the email link holds the token.
export const MAGIC_LINK_STORAGE_KEY = "everyday.magicLink"

// sent_at is the time of the send in milliseconds (Date.now()).
export type StoredMagicLink = {
  request_id: string
  secret: string
  email: string
  redirect: string | null
  sent_at: number
}

function isStoredMagicLink(value: unknown): value is StoredMagicLink {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.request_id === "string" &&
    typeof record.secret === "string" &&
    typeof record.email === "string" &&
    (typeof record.redirect === "string" || record.redirect === null) &&
    typeof record.sent_at === "number" &&
    Number.isFinite(record.sent_at)
  )
}

// Returns false when the browser blocks localStorage, for example in a private window.
export function saveMagicLink(record: StoredMagicLink): boolean {
  if (import.meta.server) {
    return false
  }
  try {
    localStorage.setItem(MAGIC_LINK_STORAGE_KEY, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

// Returns null when there is no valid record or the browser blocks localStorage.
export function readMagicLink(): StoredMagicLink | null {
  if (import.meta.server) {
    return null
  }
  try {
    const raw = localStorage.getItem(MAGIC_LINK_STORAGE_KEY)
    if (raw === null) {
      return null
    }
    const value: unknown = JSON.parse(raw)
    if (!isStoredMagicLink(value)) {
      return null
    }
    const { request_id, secret, email, redirect, sent_at } = value
    return { request_id, secret, email, redirect, sent_at }
  } catch {
    return null
  }
}

// Removes the record. A blocked localStorage has no record, so the error is ignored.
export function clearMagicLink(): void {
  if (import.meta.server) {
    return
  }
  try {
    localStorage.removeItem(MAGIC_LINK_STORAGE_KEY)
  } catch {
    // Nothing to remove.
  }
}
