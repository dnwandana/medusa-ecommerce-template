// Returns the value if it is a path of this site. Returns the fallback for all other values.
// A value that starts with "//" or contains "\" can open a different site, so it is rejected.
export function safeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback
  }
  return value
}
