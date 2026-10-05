// Returns the locale that the customer used before the payment page.
export function resolveReturnLocale(
  cookieValue: string | null | undefined,
  localeCodes: string[],
  fallback: string
): string {
  // Accept only a known code, so that the cookie cannot put a path into the redirect.
  if (cookieValue && localeCodes.includes(cookieValue)) {
    return cookieValue
  }
  return fallback
}
