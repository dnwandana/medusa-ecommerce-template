import type { HttpTypes } from "@medusajs/types"

// The price of a variant needs these fields and a region ID.
export const PRODUCT_FIELDS = "*variants.calculated_price,+variants.inventory_quantity"
export const PAGE_SIZE = 12

// Returns the functions that read products and categories from the Store API.
export function useCatalog(): {
  listProducts(options?: {
    limit?: number
    offset?: number
    categoryId?: string
  }): Promise<{ products: HttpTypes.StoreProduct[]; count: number }>
  getProductByHandle(handle: string): Promise<HttpTypes.StoreProduct | null>
  listCategories(): Promise<HttpTypes.StoreProductCategory[]>
  getCategoryByHandle(handle: string): Promise<HttpTypes.StoreProductCategory | null>
} {
  // The Nuxt context is not available after an await. Get the SDK and the region here.
  const sdk = useMedusa()
  const { ensureRegion } = useRegion()

  async function listProducts(
    options: { limit?: number; offset?: number; categoryId?: string } = {}
  ): Promise<{ products: HttpTypes.StoreProduct[]; count: number }> {
    const region = await ensureRegion()
    const query: HttpTypes.StoreProductListParams = {
      region_id: region.id,
      fields: PRODUCT_FIELDS,
      limit: options.limit ?? PAGE_SIZE,
      offset: options.offset ?? 0,
    }
    if (options.categoryId) {
      query.category_id = [options.categoryId]
    }

    const { products, count } = await sdk.store.product.list(query)
    return { products, count }
  }

  async function getProductByHandle(handle: string): Promise<HttpTypes.StoreProduct | null> {
    const region = await ensureRegion()
    const { products } = await sdk.store.product.list({
      region_id: region.id,
      fields: PRODUCT_FIELDS,
      handle,
      limit: 1,
    })
    return products[0] ?? null
  }

  async function listCategories(): Promise<HttpTypes.StoreProductCategory[]> {
    const { product_categories } = await sdk.store.category.list({})
    return product_categories
  }

  async function getCategoryByHandle(
    handle: string
  ): Promise<HttpTypes.StoreProductCategory | null> {
    const { product_categories } = await sdk.store.category.list({ handle, limit: 1 })
    return product_categories[0] ?? null
  }

  return { listProducts, getProductByHandle, listCategories, getCategoryByHandle }
}
