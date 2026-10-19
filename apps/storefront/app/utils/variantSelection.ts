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

// Returns the variant with the id in a `?variant=` query value, or null. The value is untrusted,
// so an array, an unknown id, or a product with one variant gives null.
export function variantFromQuery(
  product: HttpTypes.StoreProduct,
  value: unknown
): HttpTypes.StoreProductVariant | null {
  const variants = product.variants ?? []
  if (typeof value !== "string" || variants.length < 2) {
    return null
  }
  return variants.find((variant) => variant.id === value) ?? null
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

export type OptionValueStock = { value: string; soldOut: boolean }

// Returns each value of the option with its stock state. A value is sold out when no variant
// with that value and the selected values of the other options can be bought now. An option
// with no selected value is not a condition.
export function optionValueStock(
  product: HttpTypes.StoreProduct,
  selected: Record<string, string>,
  optionId: string
): OptionValueStock[] {
  const option = (product.options ?? []).find((item) => item.id === optionId)
  const variants = product.variants ?? []
  const valueOf = (variant: HttpTypes.StoreProductVariant, id: string) =>
    (variant.options ?? []).find((item) => item.option_id === id)?.value
  const conditions = Object.entries(selected).filter(([id, value]) => id !== optionId && !!value)

  return (option?.values ?? []).map(({ value }) => ({
    value,
    soldOut: !variants.some(
      (variant) =>
        valueOf(variant, optionId) === value &&
        conditions.every(([id, selectedValue]) => valueOf(variant, id) === selectedValue) &&
        isPurchasable(variant)
    ),
  }))
}

// Returns the most units that the customer can buy, or null when the stock sets no limit.
export function stockLimit(variant: HttpTypes.StoreProductVariant | null): number | null {
  if (!variant || variant.manage_inventory === false || variant.allow_backorder === true) {
    return null
  }
  return Math.max(variant.inventory_quantity ?? 0, 0)
}
