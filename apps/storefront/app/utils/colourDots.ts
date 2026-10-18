import type { HttpTypes } from "@medusajs/types"
import type { StoreColour } from "../types/storefront"
import { findColourOption } from "./optionNames"

export type ColourDot = { name: string; hex: string }

// The hex goes into an inline style, so only a 6-digit hex colour passes.
const HEX_PATTERN = /^#[0-9a-f]{6}$/i

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function validHex(value: unknown): string | null {
  return typeof value === "string" && HEX_PATTERN.test(value) ? value : null
}

// Returns the product metadata colour_hex, or null when it is not a plain object.
function productHexes(product: HttpTypes.StoreProduct): Record<string, unknown> | null {
  const value = product.metadata?.colour_hex
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

// Returns the hex of a colour name. The product hex wins over the store list.
export function colourHex(
  name: string,
  product: HttpTypes.StoreProduct,
  colours: StoreColour[]
): string | null {
  const own = Object.entries(productHexes(product) ?? {}).find(([key]) => sameName(key, name))
  const ownHex = validHex(own?.[1])
  if (ownHex) {
    return ownHex
  }
  return validHex(colours.find((colour) => sameName(colour.name, name))?.hex)
}

// Returns one dot for each value of the colour option. A value with no hex gives no dot.
export function colourDots(product: HttpTypes.StoreProduct, colours: StoreColour[]): ColourDot[] {
  const option = findColourOption(product)
  const dots: ColourDot[] = []
  for (const { value } of option?.values ?? []) {
    const hex = colourHex(value, product, colours)
    if (hex) {
      dots.push({ name: value, hex })
    }
  }
  return dots
}
