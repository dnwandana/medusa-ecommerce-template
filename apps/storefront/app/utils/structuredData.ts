import { absoluteUrl } from "./seoText"

export type BreadcrumbEntry = { name: string; url: string | null } // url is absolute

const SCHEMA = "https://schema.org"

function origin(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, "")
}

// Returns the BreadcrumbList of the visible breadcrumb trail. The last item is the current page,
// so it has no link.
export function breadcrumbJsonLd(items: BreadcrumbEntry[]): Record<string, unknown> {
  return {
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      ...(entry.url && index < items.length - 1 ? { item: entry.url } : {}),
    })),
  }
}

// Returns the OnlineStore node of the home page. It has no shipping markup, because the template
// does not know a fixed shipping price. Each contact key shows only when the owner set a value.
export function onlineStoreJsonLd(input: {
  name: string
  siteUrl: string
  returnsUrl: string // absolute, in the page locale
  email: string | null
  telephone: string | null
  address: string | null
  sameAs: string[] // the URLs of the social links, marketplaces too
}): Record<string, unknown> {
  return {
    "@context": SCHEMA,
    "@type": "OnlineStore",
    name: input.name,
    url: origin(input.siteUrl),
    logo: absoluteUrl("/logo.png", input.siteUrl),
    ...(input.email ? { email: input.email } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.address ? { address: input.address } : {}),
    ...(input.sameAs.length ? { sameAs: input.sameAs } : {}),
    // Only the link and the country. The client decides the return window and the fees.
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "ID",
      merchantReturnLink: input.returnsUrl,
    },
  }
}

// Returns the WebSite node of the home page. It has no SearchAction, because Google removed the
// sitelinks search box in 2024.
export function websiteJsonLd(input: {
  name: string
  siteUrl: string
  language: string // "en-US" or "id-ID"
}): Record<string, unknown> {
  return {
    "@context": SCHEMA,
    "@type": "WebSite",
    name: input.name,
    url: origin(input.siteUrl),
    inLanguage: input.language,
  }
}

// Returns the head script of a JSON-LD node. Each "<" becomes a JSON unicode escape (backslash,
// u003c), so a product text with "</script>" cannot close the tag. JSON.parse reads the escape
// back as "<".
export function jsonLdScript(data: Record<string, unknown>): {
  type: "application/ld+json"
  innerHTML: string
} {
  return {
    type: "application/ld+json",
    innerHTML: JSON.stringify(data).replace(/</g, "\\u003c"),
  }
}
