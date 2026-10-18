import type { HttpTypes } from "@medusajs/types"
import { findColourOption } from "./optionNames"

export type GalleryImage = { id: string; url: string }

// The Store API types do not name the links between images and variants.
type LinkedImage = HttpTypes.StoreProductImage & { variants?: { id: string }[] | null }
type LinkedVariant = HttpTypes.StoreProductVariant & { images?: { id: string }[] | null }

// Returns the images of the product page for a colour.
// The images of the colour variants show first in rank order, with the images that have no
// variant link. A colour with no linked image shows all the images.
export function galleryImages(
  product: HttpTypes.StoreProduct,
  colour: string | null
): GalleryImage[] {
  // A missing rank sorts last. The sort is stable, so the list order breaks a tie.
  const images = [...((product.images ?? []) as LinkedImage[])].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
  )
  if (images.length === 0) {
    return product.thumbnail ? [{ id: "thumbnail", url: product.thumbnail }] : []
  }
  const all = images.map((image) => ({ id: image.id, url: image.url }))

  const option = findColourOption(product)
  if (!option) {
    return all
  }

  const variants = (product.variants ?? []) as LinkedVariant[]
  const colourOf = (variant: LinkedVariant): string | undefined =>
    variant.options?.find((value) => value.option_id === option.id)?.value
  // ProductPurchase selects the options of the first variant at the start.
  const selected =
    colour ?? (variants[0] && colourOf(variants[0])) ?? option.values?.[0]?.value ?? null
  const colourVariantIds = new Set(
    variants.filter((variant) => colourOf(variant) === selected).map((variant) => variant.id)
  )

  // The link can come as images.variants or as variants.images.
  const linksOf = new Map<string, Set<string>>()
  for (const image of images) {
    linksOf.set(image.id, new Set((image.variants ?? []).map((variant) => variant.id)))
  }
  for (const variant of variants) {
    for (const image of variant.images ?? []) {
      linksOf.get(image.id)?.add(variant.id)
    }
  }

  const linked = (id: string) => [...(linksOf.get(id) ?? [])].some((v) => colourVariantIds.has(v))
  if (!images.some((image) => linked(image.id))) {
    return all
  }
  return all.filter((image) => linked(image.id) || (linksOf.get(image.id)?.size ?? 0) === 0)
}
