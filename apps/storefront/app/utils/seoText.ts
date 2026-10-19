import type { HttpTypes } from "@medusajs/types"
import { formatPrice } from "./formatPrice"
import { findColourOption } from "./optionNames"
import { priceView } from "./productBadges"
import { variantPrice } from "./variantSelection"

// The helpers read no Nuxt state, so the Nitro server routes can import this file too.

const DESCRIPTION_MAX = 160
const PART_SEPARATOR = " · "

// Returns the page title with the store name. An empty page title gives the store name only.
export function fullTitle(title: string, brand: string): string {
  return title ? `${title} | ${brand}` : brand
}

// Returns the home page title. The store name comes first, then an en dash (U+2013).
export function homeTitle(brand: string, headline: string): string {
  return `${brand} – ${headline}`
}

// Returns the text on one line, cut at a word to at most `max` characters. A cut text ends with
// an ellipsis, so the reader knows that the text continues on the page.
export function cutDescription(text: string, max: number = DESCRIPTION_MAX): string {
  const line = text.replace(/\s+/g, " ").trim()
  if (line.length <= max) {
    return line
  }
  // The ellipsis takes one character, so the text before it has at most max - 1 characters.
  const head = line.slice(0, max - 1)
  const space = head.lastIndexOf(" ")
  return `${(space > 0 ? head.slice(0, space) : head).trimEnd()}…`
}

// Returns the URL as an absolute URL. A relative URL gets the site URL in front.
export function absoluteUrl(url: string, siteUrl: string): string {
  return new URL(url, `${siteUrl.replace(/\/+$/, "")}/`).toString()
}

// Returns the option values of the variant, the colour first, then the other options in product
// option order. A product with one variant has no label, because its value (for example
// "Default") tells the customer nothing.
export function variantLabel(
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant
): string {
  if ((product.variants ?? []).length < 2) {
    return ""
  }
  const colour = findColourOption(product)
  const options = [
    ...(colour ? [colour] : []),
    ...(product.options ?? []).filter((option) => option.id !== colour?.id),
  ]
  return options
    .map((option) => variant.options?.find((value) => value.option_id === option.id)?.value)
    .filter((value): value is string => !!value)
    .join(", ")
}

// Returns the meta description of a product page. With a variant, the parts are the variant
// label, its price, and the product description. Without a variant, the parts are the lowest
// price and the product description. A missing part is skipped.
export function productSeoDescription(input: {
  product: HttpTypes.StoreProduct
  variant: HttpTypes.StoreProductVariant | null
}): string {
  const { product, variant } = input
  const price = variant ? variantPrice(variant) : priceView(product.variants ?? []).amount
  const parts = [
    variant ? variantLabel(product, variant) : "",
    price === null ? "" : formatPrice(price),
    product.description ?? "",
  ]
  return cutDescription(parts.filter((part) => part.trim() !== "").join(PART_SEPARATOR))
}
