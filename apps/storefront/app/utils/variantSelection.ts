import type { HttpTypes } from "@medusajs/types"

// Returns the variant that has each selected option value. Returns null if no variant agrees or
// if an option of the variant is not selected.
export function findVariant(
  product: HttpTypes.StoreProduct,
  selected: Record<string, string>
): HttpTypes.StoreProductVariant | null {
  const variants = product.variants ?? []
  const match = variants.find((variant) =>
    (variant.options ?? []).every(
      (item) => !!item.option_id && selected[item.option_id] === item.value
    )
  )
  return match ?? null
}

// Returns true if the customer can buy the variant now.
export function isPurchasable(variant: HttpTypes.StoreProductVariant): boolean {
  if (variant.manage_inventory === false || variant.allow_backorder === true) {
    return true
  }
  return (variant.inventory_quantity ?? 0) > 0
}

// Returns the price of the variant for the region, or null.
export function variantPrice(variant: HttpTypes.StoreProductVariant | null): number | null {
  return variant?.calculated_price?.calculated_amount ?? null
}
