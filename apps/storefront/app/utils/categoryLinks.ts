import type { HttpTypes } from "@medusajs/types"

export type CategoryLink = { id: string; name: string; to: string; current: boolean }

// Returns "All" for the category, then its children in the Medusa rank order.
// A category with no children gets no links, because "All" alone has no choice to give.
export function childCategoryLinks(
  category: HttpTypes.StoreProductCategory,
  allLabel: string
): CategoryLink[] {
  const children = [...(category.category_children ?? [])].sort(
    (a, b) => (a.rank ?? 0) - (b.rank ?? 0)
  )
  if (children.length === 0) {
    return []
  }
  return [
    { id: category.id, name: allLabel, to: `/categories/${category.handle}`, current: true },
    ...children.map((child) => ({
      id: child.id,
      name: child.name,
      to: `/categories/${child.handle}`,
      current: false,
    })),
  ]
}

// Returns the ids of the children of the category, and of their children, at each depth. The
// category must come with the descendants tree.
export function descendantCategoryIds(category: HttpTypes.StoreProductCategory): string[] {
  return (category.category_children ?? []).flatMap((child) => [
    child.id,
    ...descendantCategoryIds(child),
  ])
}

// Returns "All" for all products, then the top-level categories in the given order.
export function topCategoryLinks(
  categories: { id: string; name: string; handle: string; parent_category_id?: string | null }[],
  allLabel: string
): CategoryLink[] {
  return [
    { id: "all", name: allLabel, to: "/products", current: true },
    ...categories
      .filter((category) => !category.parent_category_id)
      .map((category) => ({
        id: category.id,
        name: category.name,
        to: `/categories/${category.handle}`,
        current: false,
      })),
  ]
}
