// Product option titles that the storefront treats as the colour or the size. Staff type the
// titles by hand, so the match ignores the case and the outer spaces.
export const COLOUR_OPTION_NAMES = ["colour", "color", "warna"] as const
export const SIZE_OPTION_NAMES = ["size", "ukuran"] as const

// A product tag with this prefix names the fabric, for example "Fabric: Linen".
export const FABRIC_TAG_PREFIX = "Fabric:"

function matches(names: readonly string[], title: string): boolean {
  return names.includes(title.trim().toLowerCase())
}

// Returns true when the option title names the colour.
export function isColourOption(title: string): boolean {
  return matches(COLOUR_OPTION_NAMES, title)
}

// Returns true when the option title names the size.
export function isSizeOption(title: string): boolean {
  return matches(SIZE_OPTION_NAMES, title)
}

// Returns the fabric label of a tag value, or null when the tag is not a fabric tag or has no
// label.
export function fabricLabel(value: string): string | null {
  if (!value.startsWith(FABRIC_TAG_PREFIX)) {
    return null
  }
  const label = value.slice(FABRIC_TAG_PREFIX.length).trim()
  return label === "" ? null : label
}
