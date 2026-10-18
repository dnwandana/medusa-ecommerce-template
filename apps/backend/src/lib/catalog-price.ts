export type CatalogSort = "newest" | "price-asc" | "price-desc"

export const CATALOG_SORTS = ["newest", "price-asc", "price-desc"] as const

export type ListedProduct = {
  id: string
  created_at: string | Date
  options: { values: { id: string }[] }[] | null
  tags: { id: string }[] | null
  variants: { calculated_price?: { calculated_amount: number | null } | null }[] | null
}

export type CatalogFilterIds = { size: string[]; colour: string[]; fabric: string[] }

// Returns the lowest calculated price of the variants, or null when no variant has a price in the
// region. Amounts are whole rupiah, as Medusa stores them.
export function lowestPrice(product: ListedProduct): number | null {
  let lowest: number | null = null
  for (const variant of product.variants ?? []) {
    const amount = variant.calculated_price?.calculated_amount
    if (typeof amount === "number" && (lowest === null || amount < lowest)) {
      lowest = amount
    }
  }
  return lowest
}

// Returns true when the product matches each filter. An empty list does not filter. The ids in
// one list combine with OR, and the lists combine with AND.
export function matchesFilters(product: ListedProduct, filters: CatalogFilterIds): boolean {
  const valueIds = new Set(
    (product.options ?? []).flatMap((option) => (option.values ?? []).map(({ id }) => id))
  )
  const tagIds = new Set((product.tags ?? []).map(({ id }) => id))
  const matches = (ids: string[], own: Set<string>) =>
    ids.length === 0 || ids.some((id) => own.has(id))

  return (
    matches(filters.size, valueIds) &&
    matches(filters.colour, valueIds) &&
    matches(filters.fabric, tagIds)
  )
}

// Returns the product ids in the order of the list. With from or to, it keeps the products whose
// lowest price is at least from and below to. A product with no price is left out of a price
// filter and goes last in a price sort. Equal prices and the newest sort put the newest first.
export function orderProductIds(
  products: ListedProduct[],
  options: { from?: number; to?: number; sort: CatalogSort }
): string[] {
  const { from, to, sort } = options
  const rows = products.map((product) => ({
    id: product.id,
    price: lowestPrice(product),
    time: new Date(product.created_at).getTime(),
  }))

  const hasPriceFilter = from !== undefined || to !== undefined
  const kept = hasPriceFilter
    ? rows.filter(
        ({ price }) =>
          price !== null &&
          (from === undefined || price >= from) &&
          (to === undefined || price < to)
      )
    : rows

  const direction = sort === "price-desc" ? -1 : 1
  return kept
    .sort((a, b) => {
      if (sort !== "newest" && a.price !== b.price) {
        if (a.price === null) {
          return 1
        }
        if (b.price === null) {
          return -1
        }
        return (a.price - b.price) * direction
      }
      return b.time - a.time
    })
    .map(({ id }) => id)
}
