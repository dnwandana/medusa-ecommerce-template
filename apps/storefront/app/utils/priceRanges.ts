import { formatPrice } from "./formatPrice"

// "from" is in the range and "to" is not. The last range has no "to".
// The key is the value of the "price" URL query, for example "500000-1000000".
export type PriceRange = { key: string; from: number; to: number | null }

type Translate = (key: string, params: Record<string, string>) => string

// Returns N + 1 ranges for N price limits. The limits come sorted with no duplicate, and a limit
// that is not a whole number above 0 is dropped.
export function priceRanges(limits: number[]): PriceRange[] {
  const bounds = [...new Set(limits.filter((limit) => Number.isSafeInteger(limit) && limit > 0))]
  bounds.sort((a, b) => a - b)
  if (bounds.length === 0) {
    return []
  }

  const starts = [0, ...bounds]
  return starts.map((from, index) => {
    const to = bounds[index] ?? null
    return { key: `${from}-${to ?? ""}`, from, to }
  })
}

// Returns the range of a URL key. A key that the price limits do not make gives null, so an old
// link shows no price filter.
export function findPriceRange(limits: number[], key: string | null): PriceRange | null {
  if (!key) {
    return null
  }
  return priceRanges(limits).find((range) => range.key === key) ?? null
}

// Makes the label from the numbers, so the settings keep no label text.
export function priceRangeLabel(range: PriceRange, t: Translate): string {
  if (range.from === 0 && range.to !== null) {
    return t("listing.priceUnder", { price: formatPrice(range.to) })
  }
  if (range.to === null) {
    return t("listing.priceOver", { price: formatPrice(range.from) })
  }
  return t("listing.priceBetween", { from: formatPrice(range.from), to: formatPrice(range.to) })
}

// Returns the price bounds for the catalog products route. The first range has no lower bound
// and the last range has no upper bound.
export function priceRangeQuery(range: PriceRange | null): {
  price_from?: number
  price_to?: number
} {
  if (!range) {
    return {}
  }
  const query: { price_from?: number; price_to?: number } = {}
  if (range.from > 0) {
    query.price_from = range.from
  }
  if (range.to !== null) {
    query.price_to = range.to
  }
  return query
}
