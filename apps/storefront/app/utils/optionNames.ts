import type { HttpTypes } from "@medusajs/types"

// The storefront copy of apps/backend/src/lib/option-names.ts. Keep the two lists equal.
// Staff type the option titles by hand, so the match ignores the case and the outer spaces.
export const COLOUR_OPTION_NAMES = ["colour", "color", "warna"] as const
export const SIZE_OPTION_NAMES = ["size", "ukuran"] as const

// A product tag with this prefix names the fabric, for example "Fabric: Linen".
export const FABRIC_TAG_PREFIX = "Fabric:"

function matches(names: readonly string[], title: string | null | undefined): boolean {
  return typeof title === "string" && names.includes(title.trim().toLowerCase())
}

// Returns true when the option title names the colour.
export function isColourOption(title: string | null | undefined): boolean {
  return matches(COLOUR_OPTION_NAMES, title)
}

// Returns true when the option title names the size.
export function isSizeOption(title: string | null | undefined): boolean {
  return matches(SIZE_OPTION_NAMES, title)
}

// Returns the fabric label of a tag value, or null when the tag is not a fabric tag or has no
// label.
export function fabricLabel(tagValue: string): string | null {
  if (!tagValue.startsWith(FABRIC_TAG_PREFIX)) {
    return null
  }
  const label = tagValue.slice(FABRIC_TAG_PREFIX.length).trim()
  return label === "" ? null : label
}

// Returns the colour option of the product, or null.
export function findColourOption(
  product: HttpTypes.StoreProduct
): HttpTypes.StoreProductOption | null {
  return (product.options ?? []).find((option) => isColourOption(option.title)) ?? null
}

// Returns the size option of the product, or null.
export function findSizeOption(
  product: HttpTypes.StoreProduct
): HttpTypes.StoreProductOption | null {
  return (product.options ?? []).find((option) => isSizeOption(option.title)) ?? null
}
