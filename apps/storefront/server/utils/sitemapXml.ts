import { absoluteUrl } from "../../app/utils/seoText"

export type SitemapProduct = { handle: string; updated_at: string | null; images: string[] }
export type SitemapCategory = { handle: string; updated_at: string | null }

// The indexable pages that do not come from the Store API. Keep the list equal to the
// "sitemap: yes" rows of the crawl rules in the SEO spec.
export const STATIC_SITEMAP_PATHS = [
  "/",
  "/products",
  "/about",
  "/contact",
  "/delivery",
  "/returns",
  "/terms",
  "/privacy",
] as const

// The locales of nuxt.config.ts. English has no prefix, the same as the i18n
// prefix_except_default strategy, so the alternates agree with useLocaleHead.
const LOCALES = [
  { language: "en-US", prefix: "" },
  { language: "id-ID", prefix: "/id" },
] as const

type SitemapPage = { path: string; lastmod: string | null; images: string[] }

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// Returns the path in the locale. The Indonesian home page is "/id", not "/id/".
function localePath(path: string, prefix: string): string {
  return prefix && path === "/" ? prefix : `${prefix}${path}`
}

// Returns the two <url> entries of a page, one for each locale. Each entry names all locale
// copies, and x-default is the English copy.
function pageEntries(page: SitemapPage, siteUrl: string): string[] {
  const urls = LOCALES.map((locale) => ({
    language: locale.language,
    href: escapeXml(absoluteUrl(localePath(page.path, locale.prefix), siteUrl)),
  }))
  const alternates = [
    ...urls.map(
      (url) => `<xhtml:link rel="alternate" hreflang="${url.language}" href="${url.href}"/>`
    ),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${urls[0]!.href}"/>`,
  ]
  const images = page.images.map(
    (image) =>
      `<image:image><image:loc>${escapeXml(absoluteUrl(image, siteUrl))}</image:loc></image:image>`
  )
  return urls.map((url) =>
    [
      "<url>",
      `<loc>${url.href}</loc>`,
      ...alternates,
      ...(page.lastmod ? [`<lastmod>${escapeXml(page.lastmod)}</lastmod>`] : []),
      ...images,
      "</url>",
    ].join("")
  )
}

// Returns the date part of an ISO time stamp, because lastmod needs no time of day.
function lastmodOf(updatedAt: string | null): string | null {
  return updatedAt ? updatedAt.slice(0, 10) : null
}

// Returns the sitemap XML of the static pages, the products, and the categories in the two
// locales. It has no priority and no changefreq, because search engines ignore them.
export function buildSitemapXml(input: {
  siteUrl: string
  products: SitemapProduct[]
  categories: SitemapCategory[]
}): string {
  const siteUrl = input.siteUrl.replace(/\/+$/, "")
  const pages: SitemapPage[] = [
    ...STATIC_SITEMAP_PATHS.map((path) => ({ path, lastmod: null, images: [] })),
    ...input.products.map((product) => ({
      path: `/products/${product.handle}`,
      lastmod: lastmodOf(product.updated_at),
      images: product.images,
    })),
    ...input.categories.map((category) => ({
      path: `/categories/${category.handle}`,
      lastmod: lastmodOf(category.updated_at),
      images: [],
    })),
  ]
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
      ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' +
      ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...pages.flatMap((page) => pageEntries(page, siteUrl)),
    "</urlset>",
    "",
  ].join("\n")
}
