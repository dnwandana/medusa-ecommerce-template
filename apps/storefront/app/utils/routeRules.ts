// nuxt.config.ts loads this file before Nuxt starts, so it imports nothing from Nuxt.

// These pages show the data of one visitor. They send noindex, but robots.txt does not block
// them: a crawler must fetch a page to see its noindex.
export const PRIVATE_PATHS = ["/cart", "/checkout", "/orders", "/account", "/search"] as const

export type StorefrontRouteRule = { ssr?: boolean; headers?: Record<string, string> }

// The account pages are client-only, so their server HTML has no page tags. Thus the header
// is the only noindex signal that a crawler gets for them.
const NOINDEX_HEADERS = { "X-Robots-Tag": "noindex" }

// The account pages need the session cookie, which only the browser has.
const CLIENT_ONLY_PATHS: readonly string[] = ["/account"]

/** Returns the route rules for each private path, its subpaths, and its Indonesian copies. */
export function storefrontRouteRules(): Record<string, StorefrontRouteRule> {
  const rules: Record<string, StorefrontRouteRule> = {}
  for (const path of PRIVATE_PATHS) {
    const rule: StorefrontRouteRule = CLIENT_ONLY_PATHS.includes(path)
      ? { ssr: false, headers: { ...NOINDEX_HEADERS } }
      : { headers: { ...NOINDEX_HEADERS } }
    for (const key of [path, `${path}/**`, `/id${path}`, `/id${path}/**`]) {
      rules[key] = rule
    }
  }
  return rules
}
