import type { HttpTypes } from "@medusajs/types"
import { fabricLabel } from "./optionNames"

// The storefront copy of readProductDetails in apps/backend/src/lib/storefront-metadata.ts.
// Keep the two readers equal.
export const PRODUCT_DETAILS = "product_details"

export type LocalizedLine = { en: string; id?: string }
export type ProductDetails = { details: LocalizedLine[]; care: LocalizedLine[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Staff can type the metadata by hand. Thus the reader checks each value and never throws.
function readLines(value: unknown): LocalizedLine[] {
  if (!Array.isArray(value)) {
    return []
  }
  const lines: LocalizedLine[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.en !== "string" || item.en.trim() === "") {
      continue
    }
    const line: LocalizedLine = { en: item.en }
    if (typeof item.id === "string" && item.id.trim() !== "") {
      line.id = item.id
    }
    lines.push(line)
  }
  return lines
}

// Returns the product details and the care lines. A line with no English text is dropped.
export function readProductDetails(
  metadata: Record<string, unknown> | null | undefined
): ProductDetails {
  const value = metadata?.[PRODUCT_DETAILS]
  if (!isRecord(value)) {
    return { details: [], care: [] }
  }
  return { details: readLines(value.details), care: readLines(value.care) }
}

// Returns the text of each line in the locale. An empty Bahasa Indonesia line shows in English.
export function localizedLines(lines: LocalizedLine[], locale: string): string[] {
  return lines.map((line) => (locale === "id" && line.id?.trim() ? line.id : line.en))
}

// Returns the fabric label of the first fabric tag, or null.
export function productFabric(product: HttpTypes.StoreProduct): string | null {
  for (const tag of product.tags ?? []) {
    const label = fabricLabel(tag.value)
    if (label) {
      return label
    }
  }
  return null
}
