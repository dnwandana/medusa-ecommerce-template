import type { HttpTypes } from "@medusajs/types"
import { PAGE_SIZE, PRODUCT_FIELDS } from "./useCatalog"
import { needsPriceRoute, type CatalogState } from "~/utils/catalogQuery"
import { findPriceRange, priceRangeQuery } from "~/utils/priceRanges"

// The same shape as the answer of the catalog filters route.
export type FilterValue = { key: string; label: string; ids: string[] }
export type CatalogFilterValues = {
  sizes: FilterValue[]
  colours: FilterValue[]
  fabrics: FilterValue[]
}

export const EMPTY_FILTER_VALUES: CatalogFilterValues = { sizes: [], colours: [], fabrics: [] }

// categoryId is the category of the page. The list also shows the products of descendantIds,
// the categories below that category.
export type ListingScope = { categoryId?: string; descendantIds?: string[]; q?: string }

export type ListingPage = { products: HttpTypes.StoreProduct[]; count: number }

type CatalogProductsResponse = ListingPage & { limit: number; offset: number }

// Returns the selected keys as option value ids or tag ids. A key that the filter values do not
// have is ignored, so an old link still shows the list.
function selectedIds(keys: string[], values: FilterValue[]): string[] {
  return values.filter((value) => keys.includes(value.key)).flatMap((value) => value.ids)
}

// Returns the category and its descendants, or no id when the scope has no category.
function scopeCategoryIds(scope: ListingScope): string[] {
  return scope.categoryId ? [scope.categoryId, ...(scope.descendantIds ?? [])] : []
}

function scopeQuery(scope: ListingScope): { category_id?: string[]; q?: string } {
  const query: { category_id?: string[]; q?: string } = {}
  const categoryIds = scopeCategoryIds(scope)
  if (categoryIds.length > 0) {
    query.category_id = categoryIds
  }
  const q = scope.q?.trim()
  if (q) {
    query.q = q
  }
  return query
}

// Returns the functions that read the filter values and one page of a filtered product list.
export function useCatalogListing(): {
  listFilters(scope: ListingScope): Promise<CatalogFilterValues>
  listPage(
    scope: ListingScope,
    state: CatalogState,
    values: CatalogFilterValues,
    priceLimits: number[],
    page: number
  ): Promise<ListingPage>
} {
  // The Nuxt context is not available after an await. Get the SDK and the region here.
  const sdk = useMedusa()
  const { ensureRegion } = useRegion()

  async function listFilters(scope: ListingScope): Promise<CatalogFilterValues> {
    try {
      return await sdk.client.fetch<CatalogFilterValues>("/store/storefront/catalog/filters", {
        query: scopeQuery(scope),
      })
    } catch {
      // The list still shows, with no filter bar.
      return EMPTY_FILTER_VALUES
    }
  }

  async function listPage(
    scope: ListingScope,
    state: CatalogState,
    values: CatalogFilterValues,
    priceLimits: number[],
    page: number
  ): Promise<ListingPage> {
    const region = await ensureRegion()
    const sizeIds = selectedIds(state.size, values.sizes)
    const colourIds = selectedIds(state.colour, values.colours)
    const fabricIds = selectedIds(state.fabric, values.fabrics)
    const offset = (page - 1) * PAGE_SIZE
    // A price key that the price limits do not make counts as no price filter.
    const priceRange = findPriceRange(priceLimits, state.price)

    if (needsPriceRoute({ ...state, price: priceRange?.key ?? null })) {
      // The Store product list cannot filter or sort by the calculated price.
      const query: Record<string, unknown> = { region_id: region.id, ...scopeQuery(scope) }
      if (sizeIds.length > 0) {
        query.size = sizeIds
      }
      if (colourIds.length > 0) {
        query.colour = colourIds
      }
      if (fabricIds.length > 0) {
        query.fabric = fabricIds
      }
      Object.assign(query, priceRangeQuery(priceRange), {
        sort: state.sort,
        limit: PAGE_SIZE,
        offset,
      })
      const { products, count } = await sdk.client.fetch<CatalogProductsResponse>(
        "/store/storefront/catalog/products",
        { query }
      )
      return { products, count }
    }

    const query: HttpTypes.StoreProductListParams = {
      region_id: region.id,
      fields: PRODUCT_FIELDS,
      order: "-created_at",
      limit: PAGE_SIZE,
      offset,
    }
    Object.assign(query, scopeQuery(scope))
    // Each filter is an "or" of its values. The filters together are an "and".
    const filters: HttpTypes.StoreProductListParams[] = []
    if (sizeIds.length > 0) {
      filters.push({ option_value_id: sizeIds })
    }
    if (colourIds.length > 0) {
      filters.push({ option_value_id: colourIds })
    }
    if (fabricIds.length > 0) {
      filters.push({ tag_id: fabricIds })
    }
    if (filters.length > 0) {
      query.$and = filters
    }

    const { products, count } = await sdk.store.product.list(query)
    return { products, count }
  }

  return { listFilters, listPage }
}
