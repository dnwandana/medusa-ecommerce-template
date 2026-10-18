import { z } from "@medusajs/framework/zod"
import { fabricLabel, isColourOption, isSizeOption } from "./option-names"

// A query field with one id or a list of ids. A single value can also hold ids with commas
// between them. The result is a list, which is empty when the field is absent.
export const idList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) =>
    (Array.isArray(value) ? value : (value ?? "").split(",")).map((id) => id.trim()).filter(Boolean)
  )

// One value of a filter. key is the label in lower case, for the URL. ids are the option value
// ids, or the tag ids for a fabric.
export type FilterValue = { key: string; label: string; ids: string[] }

export type CatalogFilters = {
  sizes: FilterValue[]
  colours: FilterValue[]
  fabrics: FilterValue[]
}

export type FilterProduct = {
  options: { title: string; values: { id: string; value: string }[] }[] | null
  tags: { id: string; value: string }[] | null
}

export const SIZE_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl"]

const NUMBER = /^\d+(\.\d+)?$/

// Returns an ILIKE pattern that matches a part of the text. "%", "_" and "\" in the text match
// only themselves.
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`
}

// Collects the values of one filter. Values with the same key merge, and the first spelling
// gives the label.
class FilterValues {
  private values = new Map<string, FilterValue>()

  add(label: string, id: string): void {
    const trimmed = label.trim()
    const key = trimmed.toLowerCase()
    if (key === "") {
      return
    }
    const value = this.values.get(key)
    if (!value) {
      this.values.set(key, { key, label: trimmed, ids: [id] })
    } else if (!value.ids.includes(id)) {
      value.ids.push(id)
    }
  }

  list(): FilterValue[] {
    return [...this.values.values()]
  }
}

const byKey = (a: FilterValue, b: FilterValue): number => a.key.localeCompare(b.key)

// Gives the rank group of a size: the size list first, then the numbers, then the other sizes.
function sizeRank(key: string): [number, number] {
  const index = SIZE_ORDER.indexOf(key)
  if (index !== -1) {
    return [0, index]
  }
  return NUMBER.test(key) ? [1, Number(key)] : [2, 0]
}

function bySize(a: FilterValue, b: FilterValue): number {
  const [groupA, valueA] = sizeRank(a.key)
  const [groupB, valueB] = sizeRank(b.key)
  if (groupA !== groupB) {
    return groupA - groupB
  }
  return valueA !== valueB ? valueA - valueB : byKey(a, b)
}

// Returns the size, colour and fabric values of the products. Sizes follow SIZE_ORDER, then the
// numbers in numeric order, then the other sizes A to Z. Colours and fabrics go A to Z.
export function buildCatalogFilters(products: FilterProduct[]): CatalogFilters {
  const sizes = new FilterValues()
  const colours = new FilterValues()
  const fabrics = new FilterValues()

  for (const product of products) {
    for (const option of product.options ?? []) {
      const target = isSizeOption(option.title)
        ? sizes
        : isColourOption(option.title)
          ? colours
          : null
      if (!target) {
        continue
      }
      for (const value of option.values ?? []) {
        target.add(value.value, value.id)
      }
    }
    for (const tag of product.tags ?? []) {
      const label = fabricLabel(tag.value)
      if (label) {
        fabrics.add(label, tag.id)
      }
    }
  }

  return {
    sizes: sizes.list().sort(bySize),
    colours: colours.list().sort(byKey),
    fabrics: fabrics.list().sort(byKey),
  }
}
