import type { HttpTypes } from "@medusajs/types"
import { findColourOption, findSizeOption } from "./optionNames"
import { absoluteUrl, variantLabel } from "./seoText"
import { isPurchasable, variantPrice } from "./variantSelection"

export type ProductJsonLdInput = {
  product: HttpTypes.StoreProduct
  canonicalUrl: string // absolute, with no query
  siteUrl: string
  brand: string
  rating: { average: number; count: number } | null
}

// The Store API types do not name the links between images and variants.
type LinkedImage = HttpTypes.StoreProductImage & { variants?: { id: string }[] | null }
type LinkedVariant = HttpTypes.StoreProductVariant & { images?: { id: string }[] | null }

const SCHEMA = "https://schema.org"

// Returns the product images in rank order. A missing rank sorts last.
function rankedImages(product: HttpTypes.StoreProduct): LinkedImage[] {
  return [...((product.images ?? []) as LinkedImage[])].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
  )
}

// Returns the absolute image URLs of a variant. The variant photos come first. A variant with no
// linked photo gets all the product images, and a product with no images gets the thumbnail.
function variantImages(
  product: HttpTypes.StoreProduct,
  variant: LinkedVariant | null,
  siteUrl: string
): string[] {
  const images = rankedImages(product)
  // The link can come as variants.images or as images.variants.
  const linkedIds = new Set((variant?.images ?? []).map((image) => image.id))
  const linked = variant
    ? images.filter(
        (image) =>
          linkedIds.has(image.id) || (image.variants ?? []).some((item) => item.id === variant.id)
      )
    : []
  const urls = (linked.length > 0 ? linked : images).map((image) => image.url)
  if (urls.length === 0 && product.thumbnail) {
    urls.push(product.thumbnail)
  }
  return urls.map((url) => absoluteUrl(url, siteUrl))
}

// Returns the value of the option for the variant, or undefined.
function optionValue(
  variant: HttpTypes.StoreProductVariant,
  option: HttpTypes.StoreProductOption | null
): string | undefined {
  if (!option) {
    return undefined
  }
  return variant.options?.find((value) => value.option_id === option.id)?.value || undefined
}

// Returns the Product node of one priced variant. The keys with no value are left out, because
// Google reports an empty value as an error.
function variantProduct(
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant,
  price: number,
  name: string,
  offerUrl: string,
  siteUrl: string
): Record<string, unknown> {
  const images = variantImages(product, variant as LinkedVariant, siteUrl)
  const colour = optionValue(variant, findColourOption(product))
  const size = optionValue(variant, findSizeOption(product))
  return {
    "@type": "Product",
    ...(variant.sku ? { sku: variant.sku } : {}),
    name,
    ...(colour ? { color: colour } : {}),
    ...(size ? { size } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    offers: {
      "@type": "Offer",
      url: offerUrl,
      price,
      priceCurrency: "IDR",
      availability: `${SCHEMA}/${isPurchasable(variant) ? "InStock" : "OutOfStock"}`,
      itemCondition: `${SCHEMA}/NewCondition`,
    },
  }
}

// Returns the Product or ProductGroup JSON-LD of a product page, or null when no variant has a
// price. The markup must not claim a price that the page does not show.
export function productJsonLd(input: ProductJsonLdInput): Record<string, unknown> | null {
  const { product, canonicalUrl, siteUrl, brand, rating } = input
  const variants = product.variants ?? []
  const priced = variants
    .map((variant) => ({ variant, price: variantPrice(variant) }))
    .filter((item): item is { variant: HttpTypes.StoreProductVariant; price: number } => {
      return typeof item.price === "number"
    })
  if (priced.length === 0) {
    return null
  }

  const shared = {
    "@context": SCHEMA,
    ...(product.description ? { description: product.description } : {}),
    url: canonicalUrl,
    brand: { "@type": "Brand", name: brand },
    ...(rating && rating.count >= 1
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average,
            reviewCount: rating.count,
          },
        }
      : {}),
  }

  // The variant count decides the type, so a product keeps one type when a variant has no price.
  if (variants.length < 2) {
    const { variant, price } = priced[0]!
    return {
      ...shared,
      ...variantProduct(product, variant, price, product.title, canonicalUrl, siteUrl),
    }
  }

  const variesBy = [
    ...(findColourOption(product) ? [`${SCHEMA}/color`] : []),
    ...(findSizeOption(product) ? [`${SCHEMA}/size`] : []),
  ]
  return {
    ...shared,
    "@type": "ProductGroup",
    name: product.title,
    productGroupID: product.id,
    ...(variesBy.length > 0 ? { variesBy } : {}),
    hasVariant: priced.map(({ variant, price }) => {
      const label = variantLabel(product, variant)
      return variantProduct(
        product,
        variant,
        price,
        label ? `${product.title} – ${label}` : product.title,
        `${canonicalUrl}?variant=${encodeURIComponent(variant.id)}`,
        siteUrl
      )
    }),
  }
}
