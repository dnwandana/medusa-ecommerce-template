// Metadata keys that the admin writes and the storefront reads. The storefront uses the same keys.
export const CATEGORY_SHOW_ON_HOME = "show_on_home"
export const CATEGORY_TILE_IMAGE_URL = "tile_image_url"
export const PRODUCT_DETAILS = "product_details"
export const PRODUCT_COLOUR_HEX = "colour_hex"
export const CUSTOMER_WELCOME_SENT_AT = "welcome_sent_at"

export type LocalizedLine = { en: string; id?: string }
export type ProductDetails = { details: LocalizedLine[]; care: LocalizedLine[] }

type Metadata = Record<string, unknown> | null | undefined

const HEX_COLOUR = /^#[0-9a-f]{6}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Metadata is not typed and staff can type it by hand. Thus each reader checks each value and
// never throws.
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
export function readProductDetails(metadata: Metadata): ProductDetails {
  const value = metadata?.[PRODUCT_DETAILS]
  if (!isRecord(value)) {
    return { details: [], care: [] }
  }
  return { details: readLines(value.details), care: readLines(value.care) }
}

// Returns the colour hex values of a product. An entry with a value that is not a hex colour is
// dropped.
export function readColourHex(metadata: Metadata): Record<string, string> {
  const value = metadata?.[PRODUCT_COLOUR_HEX]
  if (!isRecord(value)) {
    return {}
  }
  const result: Record<string, string> = {}
  for (const [name, hex] of Object.entries(value)) {
    if (typeof hex === "string" && HEX_COLOUR.test(hex)) {
      result[name] = hex
    }
  }
  return result
}
