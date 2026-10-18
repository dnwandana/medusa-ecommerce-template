import type { LocationQuery, LocationQueryValue } from "vue-router"

// The same values as the sort of the catalog products route.
export type CatalogSort = "newest" | "price-asc" | "price-desc"

export type FilterName = "size" | "colour" | "fabric"

// The filter values are the keys of the catalog filters route, for example "sage".
// price is a range key, for example "500000-1000000".
export type CatalogState = {
  size: string[]
  colour: string[]
  fabric: string[]
  price: string | null
  sort: CatalogSort
  page: number
}

export const EMPTY_CATALOG_STATE: CatalogState = {
  size: [],
  colour: [],
  fabric: [],
  price: null,
  sort: "newest",
  page: 1,
}

const FILTER_NAMES: FilterName[] = ["size", "colour", "fabric"]
const SORTS: CatalogSort[] = ["newest", "price-asc", "price-desc"]
// A range key is "<from>-<to>" in whole rupiah. The last range has no "to".
const PRICE_KEY_PATTERN = /^\d+-\d*$/

function queryValues(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  if (value === undefined || value === null) {
    return []
  }
  return (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === "string"
  )
}

function firstValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  return (queryValues(value)[0] ?? "").trim()
}

// Reads a filter from a comma list (size=s,m) or from repeated keys (size=s&size=m).
function parseList(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  const keys = queryValues(value)
    .flatMap((item) => item.split(","))
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item !== "")
  return [...new Set(keys)]
}

// Returns the catalog state of a URL query. A bad value gives the default value.
export function parseCatalogQuery(query: LocationQuery): CatalogState {
  const sort = firstValue(query.sort) as CatalogSort
  const price = firstValue(query.price)
  const page = firstValue(query.page)
  const pageNumber = /^\d+$/.test(page) ? Number(page) : 0

  return {
    size: parseList(query.size),
    colour: parseList(query.colour),
    fabric: parseList(query.fabric),
    price: PRICE_KEY_PATTERN.test(price) ? price : null,
    sort: SORTS.includes(sort) ? sort : "newest",
    page: Number.isSafeInteger(pageNumber) && pageNumber >= 1 ? pageNumber : 1,
  }
}

// Returns the URL query of a catalog state. The URL leaves out the default values.
export function toCatalogQuery(state: CatalogState): Record<string, string> {
  const query: Record<string, string> = {}
  for (const name of FILTER_NAMES) {
    if (state[name].length > 0) {
      query[name] = state[name].join(",")
    }
  }
  if (state.price) {
    query.price = state.price
  }
  if (state.sort !== "newest") {
    query.sort = state.sort
  }
  if (state.page !== 1) {
    query.page = String(state.page)
  }
  return query
}

// Adds the key to the filter or removes it. A new filter starts at page 1.
export function toggleFilterValue(
  state: CatalogState,
  name: FilterName,
  key: string
): CatalogState {
  const values = state[name]
  const next = values.includes(key) ? values.filter((item) => item !== key) : [...values, key]
  return { ...state, [name]: next, page: 1 }
}

// Removes all filters and the price range. The sort stays.
export function clearFilters(state: CatalogState): CatalogState {
  return { ...EMPTY_CATALOG_STATE, sort: state.sort }
}

// Returns the number of selected filter values, plus 1 for a price range.
export function activeFilterCount(state: CatalogState): number {
  const values = FILTER_NAMES.reduce((sum, name) => sum + state[name].length, 0)
  return values + (state.price ? 1 : 0)
}

// The Store product list cannot filter or sort by the calculated price, so a price range or a
// price sort needs the catalog products route.
export function needsPriceRoute(state: CatalogState): boolean {
  return state.price !== null || state.sort !== "newest"
}
