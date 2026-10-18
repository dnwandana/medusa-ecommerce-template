import { CATEGORY_SHOW_ON_HOME, CATEGORY_TILE_IMAGE_URL } from "./storefront-metadata"

export type HomeCategory = { id: string; name: string; handle: string; image: string | null }

export type TileCategory = {
  id: string
  name: string
  handle: string
  rank: number
  metadata: Record<string, unknown> | null
}

export type TileProduct = {
  thumbnail: string | null
  created_at: string | Date
  categories: { id: string }[]
}

// Returns true when staff show the category on the home page. Metadata is not typed, so only the
// boolean true counts.
export function isHomeCategory(category: TileCategory): boolean {
  return category.metadata?.[CATEGORY_SHOW_ON_HOME] === true
}

// Returns the tile image that staff uploaded. The value "" means no image.
function uploadedImage(category: TileCategory): string | null {
  const value = category.metadata?.[CATEGORY_TILE_IMAGE_URL]
  return typeof value === "string" && value.trim() !== "" ? value : null
}

// Returns the thumbnail of the newest product of each category. A product with no thumbnail does
// not count.
function newestThumbnails(products: TileProduct[]): Map<string, string> {
  const newest = new Map<string, { thumbnail: string; time: number }>()
  for (const product of products) {
    if (!product.thumbnail) {
      continue
    }
    const time = new Date(product.created_at).getTime()
    for (const { id } of product.categories ?? []) {
      const current = newest.get(id)
      if (!current || time > current.time) {
        newest.set(id, { thumbnail: product.thumbnail, time })
      }
    }
  }
  return new Map([...newest].map(([id, { thumbnail }]) => [id, thumbnail]))
}

// Returns the home categories in rank order. The image is the uploaded tile image, else the
// thumbnail of the newest product of the category, else null.
export function buildHomeCategories(
  categories: TileCategory[],
  products: TileProduct[]
): HomeCategory[] {
  const thumbnails = newestThumbnails(products)
  return categories
    .filter(isHomeCategory)
    .sort((a, b) => a.rank - b.rank)
    .map((category) => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
      image: uploadedImage(category) ?? thumbnails.get(category.id) ?? null,
    }))
}
