// Returns the tracking URL only when it uses https. Staff type the URL in the admin, so a
// javascript:, data: or http: value never becomes a link on the order page.
export function safeTrackingUrl(url: string | null | undefined): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  return parsed.protocol === "https:" ? parsed.href : null
}
