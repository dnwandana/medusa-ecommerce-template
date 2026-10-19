import type { MaybeRefOrGetter } from "vue"
import { absoluteUrl, cutDescription, fullTitle, homeTitle } from "~/utils/seoText"
import { jsonLdScript } from "~/utils/structuredData"

export type SeoImage = { url: string; width?: number; height?: number; alt: string }

export type PageSeoInput = {
  title: string // the page title, with no store name
  description: string
  image?: SeoImage | null // null or missing: the default share image
  type?: "website" | "product" // default "website"
  home?: boolean // true: the title is homeTitle(store, title)
  jsonLd?: (Record<string, unknown> | null)[] // null entries are skipped
}

// Each client replaces the file, but keeps the size (1200×630).
const DEFAULT_IMAGE = { url: "/og-default.jpg", width: 1200, height: 630 }

// The meta tags of useLocaleHead that a page keeps. The page writes the other tags itself.
const LOCALE_META = new Set(["og:url", "og:locale", "og:locale:alternate"])

// Returns the public origin of the storefront with no trailing slash. All absolute URLs of the
// head come from this value, never from the Host header of the request.
export function useSiteUrl(): string {
  return String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, "")
}

// Writes the head of an indexable page: the title, the description, the canonical and hreflang
// links, the Open Graph and Twitter tags, and the JSON-LD scripts. While the input is null, it
// writes nothing, for example while the page data loads. Private pages must not call it.
export function usePageSeo(input: MaybeRefOrGetter<PageSeoInput | null>): void {
  const { brand } = useAppConfig()
  const { locales } = useI18n()
  const siteUrl = useSiteUrl()
  // The i18n baseUrl is not set, so the links are relative. siteUrl makes them absolute.
  const localeHead = useLocaleHead({ dir: false, lang: false, seo: { canonicalQueries: ["page"] } })

  const page = computed(() => toValue(input))
  const title = computed(() => {
    const value = page.value
    if (!value) {
      return undefined
    }
    return value.home ? homeTitle(brand.name, value.title) : fullTitle(value.title, brand.name)
  })
  const description = computed(() =>
    page.value ? cutDescription(page.value.description) : undefined
  )
  const image = computed(() => {
    if (!page.value) {
      return undefined
    }
    const value = page.value.image ?? { ...DEFAULT_IMAGE, alt: brand.name }
    return { ...value, url: absoluteUrl(value.url, siteUrl) }
  })
  // useLocaleHead also adds the bare language ("en"). The sitemap names only the language tags
  // and x-default, so the head names the same set.
  const hreflangs = computed(
    () => new Set(["x-default", ...locales.value.map((locale) => locale.language)])
  )

  useHead(() => {
    if (!page.value) {
      return {}
    }
    const { link, meta } = localeHead.value
    return {
      title: title.value,
      // The title already has the store name, so the template of the layout must not apply.
      titleTemplate: null,
      link: [
        ...link
          .filter((entry) => entry.rel === "canonical")
          .map((entry) => ({ rel: "canonical" as const, href: absoluteUrl(entry.href, siteUrl) })),
        ...link.flatMap((entry) =>
          "hreflang" in entry && hreflangs.value.has(entry.hreflang)
            ? [
                {
                  rel: "alternate" as const,
                  href: absoluteUrl(entry.href, siteUrl),
                  hreflang: entry.hreflang,
                },
              ]
            : []
        ),
      ],
      meta: [
        ...meta
          .filter((entry) => LOCALE_META.has(String(entry.property)))
          .map((entry) => ({
            property: String(entry.property),
            content:
              entry.property === "og:url"
                ? absoluteUrl(String(entry.content), siteUrl)
                : String(entry.content),
          })),
        // The Unhead type of ogType has no "product", but the Open Graph product type is valid.
        { property: "og:type", content: page.value.type ?? "website" },
      ],
      script: (page.value.jsonLd ?? [])
        .filter((data): data is Record<string, unknown> => data !== null)
        .map(jsonLdScript),
    }
  })

  useSeoMeta({
    description: () => description.value,
    ogTitle: () => title.value,
    ogDescription: () => description.value,
    ogSiteName: () => (page.value ? brand.name : undefined),
    ogImage: () => image.value?.url,
    // A missing size gives no tag. Only the default image has a known size.
    ogImageWidth: () => image.value?.width,
    ogImageHeight: () => image.value?.height,
    ogImageAlt: () => image.value?.alt,
    twitterCard: () => (page.value ? "summary_large_image" : undefined),
  })
}
