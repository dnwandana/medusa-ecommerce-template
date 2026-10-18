import type { HttpTypes } from "@medusajs/types"

// The card, the badges, the colour dots and the gallery need these fields. The price of a variant
// also needs a region ID.
export const PRODUCT_FIELDS =
  "*variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,*variants.options,*options.values,*tags,*images,+metadata,+created_at"
// The product page also needs the image links for the gallery, and the categories for the
// breadcrumbs and "You may also like". The Store product route allows variants.images, not
// images.variants, and it does not allow categories.parent_category.
export const PRODUCT_PAGE_FIELDS = `${PRODUCT_FIELDS},*variants.images,*categories`
export const PAGE_SIZE = 12

// isLimitedStock and stockLimit read only these fields of a variant.
export type VariantStock = Pick<
  HttpTypes.StoreProductVariant,
  "id" | "inventory_quantity" | "manage_inventory" | "allow_backorder"
>

// The stock request asks for no price and no image, so it stays small.
export const VARIANT_STOCK_FIELDS =
  "id,variants.id,variants.manage_inventory,variants.allow_backorder,+variants.inventory_quantity"

// Returns the functions that read products and categories from the Store API.
export function useCatalog(): {
  listProducts(options?: {
    limit?: number
    offset?: number
    categoryId?: string
    q?: string
  }): Promise<{ products: HttpTypes.StoreProduct[]; count: number }>
  getProductByHandle(handle: string): Promise<HttpTypes.StoreProduct | null>
  listCategories(): Promise<HttpTypes.StoreProductCategory[]>
  getCategoryByHandle(handle: string): Promise<HttpTypes.StoreProductCategory | null>
  listVariantStock(productIds: string[]): Promise<Record<string, VariantStock>>
} {
  // The Nuxt context is not available after an await. Get the SDK and the region here.
  const sdk = useMedusa()
  const { ensureRegion } = useRegion()

  async function listProducts(
    options: { limit?: number; offset?: number; categoryId?: string; q?: string } = {}
  ): Promise<{ products: HttpTypes.StoreProduct[]; count: number }> {
    const region = await ensureRegion()
    // Each list shows the newest products first.
    const query: HttpTypes.StoreProductListParams = {
      region_id: region.id,
      fields: PRODUCT_FIELDS,
      order: "-created_at",
      limit: options.limit ?? PAGE_SIZE,
      offset: options.offset ?? 0,
    }
    if (options.categoryId) {
      query.category_id = [options.categoryId]
    }
    const q = options.q?.trim()
    if (q) {
      query.q = q
    }

    const { products, count } = await sdk.store.product.list(query)
    return { products, count }
  }

  async function getProductByHandle(handle: string): Promise<HttpTypes.StoreProduct | null> {
    const region = await ensureRegion()
    const { products } = await sdk.store.product.list({
      region_id: region.id,
      fields: PRODUCT_PAGE_FIELDS,
      handle,
      limit: 1,
    })
    const product = products[0] ?? null
    if (product?.categories?.length) {
      product.categories = await withParentCategories(product.categories)
    }
    return product
  }

  // Reads the categories again from the category route, which returns the parent category.
  // The product page still shows when this request fails, with no parent in the breadcrumbs.
  async function withParentCategories(
    categories: HttpTypes.StoreProductCategory[]
  ): Promise<HttpTypes.StoreProductCategory[]> {
    const ids = categories.map((category) => category.id)
    try {
      const { product_categories } = await sdk.store.category.list({ id: ids, limit: ids.length })
      const byId = new Map(product_categories.map((category) => [category.id, category]))
      return categories.map((category) => byId.get(category.id) ?? category)
    } catch {
      return categories
    }
  }

  async function listCategories(): Promise<HttpTypes.StoreProductCategory[]> {
    const { product_categories } = await sdk.store.category.list({})
    return product_categories
  }

  async function getCategoryByHandle(
    handle: string
  ): Promise<HttpTypes.StoreProductCategory | null> {
    // The category page shows the parent in the breadcrumbs and links to the children. The page
    // also lists the products of the descendants, so the children come with their own children.
    // The Store API drops the parent from a descendants tree, so a second request reads the tree.
    const [{ product_categories }, { product_categories: trees }] = await Promise.all([
      sdk.store.category.list({
        handle,
        limit: 1,
        fields: "*parent_category,*category_children",
      }),
      sdk.store.category.list({
        handle,
        limit: 1,
        fields: "id,*category_children",
        include_descendants_tree: true,
      }),
    ])
    const category = product_categories[0]
    if (!category) {
      return null
    }
    return {
      ...category,
      category_children: trees[0]?.category_children ?? category.category_children,
    }
  }

  // Returns the stock of each variant of the products, by variant id. The cart route does not
  // return the stock. The stock does not depend on the region, so the request has no region.
  async function listVariantStock(productIds: string[]): Promise<Record<string, VariantStock>> {
    const ids = [...new Set(productIds)]
    if (ids.length === 0) {
      return {}
    }

    // The limit equals the number of products, so no variant is missing from the result.
    const { products } = await sdk.store.product.list({
      id: ids,
      fields: VARIANT_STOCK_FIELDS,
      limit: ids.length,
    })
    const stock: Record<string, VariantStock> = {}
    for (const variant of products.flatMap((product) => product.variants ?? [])) {
      stock[variant.id] = {
        id: variant.id,
        inventory_quantity: variant.inventory_quantity,
        manage_inventory: variant.manage_inventory,
        allow_backorder: variant.allow_backorder,
      }
    }
    return stock
  }

  return { listProducts, getProductByHandle, listCategories, getCategoryByHandle, listVariantStock }
}
