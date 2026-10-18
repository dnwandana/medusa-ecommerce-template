import { isHexColour } from "../../modules/storefront/settings-rules"
import { isColourOption } from "../../lib/option-names"
import { PRODUCT_COLOUR_HEX, readColourHex } from "../../lib/storefront-metadata"

export type ColourDotSource = "store" | "product" | "none"

export type ColourDotRow = { value: string; hex: string | null; source: ColourDotSource }

export const SOURCE_LABELS: Record<ColourDotSource, string> = {
  store: "Store list",
  product: "This product",
  none: "No hex",
}

/**
 * Returns one row for each value of the first colour option, in the option order. The product
 * hex wins over the store list. The store list matches the value by name, in lower case after
 * trim.
 */
export function colourDotRows(
  options: { title: string; values: { value: string }[] }[],
  productHex: Record<string, string>,
  storeColours: { name: string; hex: string }[]
): ColourDotRow[] {
  const option = options.find((item) => isColourOption(item.title))
  if (!option) {
    return []
  }
  const store = new Map(
    storeColours.map((colour) => [colour.name.trim().toLowerCase(), colour.hex])
  )
  return option.values.map(({ value }) => {
    const own = productHex[value]
    if (own) {
      return { value, hex: own, source: "product" }
    }
    const shared = store.get(value.trim().toLowerCase())
    return shared ? { value, hex: shared, source: "store" } : { value, hex: null, source: "none" }
  })
}

/** Returns the hex in lower case, or the error text when it is not in the format #rrggbb. */
export function parseHex(input: string): { hex: string | null; error: string | null } {
  const hex = input.trim().toLowerCase()
  return isHexColour(hex)
    ? { hex, error: null }
    : { hex: null, error: "Enter a hex in the format #rrggbb." }
}

/**
 * Returns the product metadata with the hex of one colour value. A null hex removes the value
 * from the map, so the dot uses the store list again. It keeps the other keys. The hex goes to
 * the product, not to the option value: an option can be shared, and a change must not reach
 * the other products.
 */
export function withColourHex(
  metadata: Record<string, unknown> | null | undefined,
  value: string,
  hex: string | null
): Record<string, unknown> {
  const map = { ...readColourHex(metadata) }
  if (hex === null) {
    delete map[value]
  } else {
    map[value] = hex
  }
  return { ...(metadata ?? {}), [PRODUCT_COLOUR_HEX]: map }
}
