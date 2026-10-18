import type { HttpTypes } from "@medusajs/types"
import type { StorefrontSettings } from "../types/storefront"
import { isPurchasable } from "./variantSelection"

// The locale key of a badge is products.badges.<badge>.
export type ProductBadge = "soldOut" | "limited" | "sale" | "new"

export type PriceView = { amount: number | null; original: number | null; percent: number | null }

const DAY_MS = 24 * 60 * 60 * 1000

// Returns the price of the cheapest variant, and the old price and the percentage of a sale.
// Amounts are whole rupiah.
export function priceView(variants: HttpTypes.StoreProductVariant[]): PriceView {
  let amount: number | null = null
  let original: number | null = null
  for (const variant of variants) {
    const price = variant.calculated_price
    if (typeof price?.calculated_amount !== "number") {
      continue
    }
    if (amount === null || price.calculated_amount < amount) {
      amount = price.calculated_amount
      original = price.original_amount ?? null
    }
  }

  if (amount === null || original === null || original <= amount) {
    return { amount, original: null, percent: null }
  }
  return { amount, original, percent: Math.round(((original - amount) / original) * 100) }
}

// Returns true when the customer cannot buy a variant of the product now.
export function isSoldOut(product: HttpTypes.StoreProduct): boolean {
  return !(product.variants ?? []).some((variant) => isPurchasable(variant))
}

// Returns true when the total stock is from 1 to the threshold. A variant that does not track
// stock or that allows backorders has no limit, so the product never shows the badge.
export function isLimitedStock(
  variants: HttpTypes.StoreProductVariant[],
  threshold: number
): boolean {
  if (threshold <= 0 || variants.length === 0) {
    return false
  }
  if (variants.some((v) => v.manage_inventory === false || v.allow_backorder === true)) {
    return false
  }
  const total = variants.reduce((sum, variant) => sum + (variant.inventory_quantity ?? 0), 0)
  return total >= 1 && total <= threshold
}

// Returns true when the product was created in the last `days` days. 0 days turns off the badge.
export function isNewProduct(
  createdAt: string | Date | null | undefined,
  days: number,
  now: Date
): boolean {
  if (days <= 0 || !createdAt) {
    return false
  }
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) {
    return false
  }
  return now.getTime() - created <= days * DAY_MS
}

// Returns the one badge of a product card. The order is Sold out, Limited stock, Sale, New.
export function productBadge(
  product: HttpTypes.StoreProduct,
  settings: StorefrontSettings,
  now: Date = new Date()
): ProductBadge | null {
  const variants = product.variants ?? []
  if (isSoldOut(product)) {
    return "soldOut"
  }
  if (isLimitedStock(variants, settings.low_stock_threshold)) {
    return "limited"
  }
  if (priceView(variants).original !== null) {
    return "sale"
  }
  if (isNewProduct(product.created_at, settings.new_badge_days, now)) {
    return "new"
  }
  return null
}
