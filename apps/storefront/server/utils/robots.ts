// The server code has no `~` alias, so this import uses a relative path.
import { FILTER_NAMES } from "../../app/utils/catalogQuery"

// A new filter gets its line automatically. The private pages are not here: they send noindex,
// and a crawler must fetch a page to see its noindex.
const BLOCKED_PARAMETERS = [...FILTER_NAMES, "price", "sort"]

/** Returns the robots.txt text that blocks the filter and sort URLs and names the sitemap. */
export function robotsTxt(siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, "")
  return [
    "User-agent: *",
    ...BLOCKED_PARAMETERS.map((name) => `Disallow: /*?*${name}=`),
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n")
}
