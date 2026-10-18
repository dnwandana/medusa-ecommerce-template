import { fabricLabel } from "../../lib/option-names"
import {
  type LocalizedLine,
  PRODUCT_DETAILS,
  type ProductDetails,
} from "../../lib/storefront-metadata"

export type LineRow = { en: string; id: string }

export type DetailsForm = { details: LineRow[]; care: LineRow[] }

type LineErrors = Record<number, string>

const EMPTY_ROW: LineRow = { en: "", id: "" }

const ENGLISH_MISSING = "Enter the English line. The Bahasa Indonesia line is optional."

function toRows(lines: LocalizedLine[]): LineRow[] {
  // An empty list gets one empty row, so staff can type the first line at once.
  return lines.length === 0
    ? [{ ...EMPTY_ROW }]
    : lines.map((line) => ({ en: line.en, id: line.id ?? "" }))
}

/** Returns the form rows of the saved product details. */
export function toDetailsForm(details: ProductDetails): DetailsForm {
  return { details: toRows(details.details), care: toRows(details.care) }
}

function parseRows(rows: LineRow[]): { lines: LocalizedLine[]; errors: LineErrors } {
  const lines: LocalizedLine[] = []
  const errors: LineErrors = {}
  rows.forEach((row, index) => {
    const en = row.en.trim()
    const id = row.id.trim()
    if (!en && !id) {
      return
    }
    if (!en) {
      errors[index] = ENGLISH_MISSING
      return
    }
    // The storefront shows the English line when the Bahasa Indonesia line is absent.
    lines.push(id ? { en, id } : { en })
  })
  return { lines, errors }
}

/**
 * Returns the product details to save, or null when a row has an error. It trims each field and
 * ignores a row whose two fields are empty.
 */
export function parseDetailsForm(form: DetailsForm): {
  value: ProductDetails | null
  errors: { details: LineErrors; care: LineErrors }
} {
  const details = parseRows(form.details)
  const care = parseRows(form.care)
  const errors = { details: details.errors, care: care.errors }
  const hasError = Object.keys(details.errors).length > 0 || Object.keys(care.errors).length > 0
  return {
    value: hasError ? null : { details: details.lines, care: care.lines },
    errors,
  }
}

/** Returns the product metadata with the product details. It keeps the other keys. */
export function withProductDetails(
  metadata: Record<string, unknown> | null | undefined,
  value: ProductDetails
): Record<string, unknown> {
  return { ...(metadata ?? {}), [PRODUCT_DETAILS]: value }
}

/** Returns the label of the first fabric tag, for example "Linen", or null. */
export function fabricFromTags(tags: { value: string }[] | null | undefined): string | null {
  for (const tag of tags ?? []) {
    const label = fabricLabel(tag.value)
    if (label) {
      return label
    }
  }
  return null
}
