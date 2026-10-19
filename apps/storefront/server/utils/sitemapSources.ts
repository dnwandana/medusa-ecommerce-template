import { buildSitemapXml, type SitemapCategory, type SitemapProduct } from "./sitemapXml"

export type FetchStore = <T>(path: string, query: Record<string, string | number>) => Promise<T>
export type SitemapSources = { products: SitemapProduct[]; categories: SitemapCategory[] }

type StoreImage = { url: string; rank?: number | null }
type StoreProductRow = {
  handle: string
  updated_at: string | null
  thumbnail: string | null
  images?: StoreImage[] | null
}
type StoreCategoryRow = { handle: string; updated_at: string | null }

const DEFAULT_PAGE_SIZE = 100

// Reads all pages of a Store API list. The loop also stops at an empty page, because a count that
// is larger than the real list must not make the loop run forever.
async function readAll<T>(
  fetchStore: FetchStore,
  path: string,
  key: string,
  fields: string,
  pageSize: number
): Promise<T[]> {
  const rows: T[] = []
  let offset = 0
  for (;;) {
    const page = await fetchStore<Record<string, unknown>>(path, {
      fields,
      limit: pageSize,
      offset,
    })
    const items = (page[key] as T[] | undefined) ?? []
    rows.push(...items)
    offset += items.length
    if (items.length === 0 || offset >= Number(page.count ?? 0)) {
      return rows
    }
  }
}

// Returns the image URLs of a product in rank order. A product with no images gives its
// thumbnail.
function productImages(product: StoreProductRow): string[] {
  const images = [...(product.images ?? [])].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
  )
  if (images.length > 0) {
    return images.map((image) => image.url)
  }
  return product.thumbnail ? [product.thumbnail] : []
}

// Loads the handles of all products and categories for the sitemap. The Store API itself keeps
// only the published products of the sales channel, so the loader adds no filter.
export async function loadSitemapSources(
  fetchStore: FetchStore,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<SitemapSources> {
  const [products, categories] = await Promise.all([
    readAll<StoreProductRow>(
      fetchStore,
      "/store/products",
      "products",
      "handle,updated_at,thumbnail,*images",
      pageSize
    ),
    readAll<StoreCategoryRow>(
      fetchStore,
      "/store/product-categories",
      "product_categories",
      "handle,updated_at",
      pageSize
    ),
  ])
  return {
    products: products.map((product) => ({
      handle: product.handle,
      updated_at: product.updated_at ?? null,
      images: productImages(product),
    })),
    categories: categories.map((category) => ({
      handle: category.handle,
      updated_at: category.updated_at ?? null,
    })),
  }
}

// Returns the sitemap XML. A backend failure gives status 503, because a sitemap with only the
// static pages tells the search engines that the products are gone.
export async function sitemapResponse(
  load: () => Promise<SitemapSources>,
  siteUrl: string
): Promise<string> {
  let sources: SitemapSources
  try {
    sources = await load()
  } catch (cause) {
    console.error("The sitemap cannot load the products and categories from the backend.", cause)
    // h3 reads statusCode from a thrown value. This file does not import h3, because h3 is not a
    // storefront dependency, so a plain Node test cannot resolve it.
    throw Object.assign(new Error("The sitemap is not available. The backend failed.", { cause }), {
      statusCode: 503,
      statusMessage: "Service Unavailable",
    })
  }
  return buildSitemapXml({ siteUrl, ...sources })
}
