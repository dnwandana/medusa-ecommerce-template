import type { HttpTypes } from "@medusajs/types"
import type { Ref } from "vue"
import { isPurchasable } from "~/utils/variantSelection"

export const RELATED_LIMIT = 4
// The filters drop some products, so the request reads more products than the section shows.
export const RELATED_FETCH_LIMIT = 12

export type RelatedSource = {
  productId: string
  categories?: HttpTypes.StoreProductCategory[] | null
  excludeIds: string[]
}

export type RelatedCategory = { id: string; name: string; handle: string }

type RelatedResult = { products: HttpTypes.StoreProduct[]; category: RelatedCategory | null }

const EMPTY_RESULT: RelatedResult = { products: [], category: null }

type Line = { product_id?: string | null; created_at?: string | Date | null }

// Returns the product of the line with the latest created_at. A tie or no date keeps the last
// line in the list.
export function latestLineProductId(items: Line[] | null | undefined): string | null {
  let latest: { productId: string; time: number } | null = null
  for (const item of items ?? []) {
    if (!item.product_id) {
      continue
    }
    const date = item.created_at ? new Date(item.created_at).getTime() : Number.NaN
    const time = Number.isNaN(date) ? Number.NEGATIVE_INFINITY : date
    if (!latest || time >= latest.time) {
      latest = { productId: item.product_id, time }
    }
  }
  return latest?.productId ?? null
}

// Returns up to 4 products of the first category of a product, newest first. The list has no
// sold-out product, no product of the source and no excluded product.
export function useRelatedProducts(
  key: string,
  source: () => RelatedSource | null
): {
  products: Ref<HttpTypes.StoreProduct[]>
  category: Ref<RelatedCategory | null>
  pending: Ref<boolean>
} {
  const { locale } = useI18n()

  // The page does not wait for this section. A change of the source loads it again.
  const { data, pending } = useLazyAsyncData(
    `related:${key}`,
    async (): Promise<RelatedResult> => {
      const current = source()
      if (!current) {
        return EMPTY_RESULT
      }
      // The SDK client keeps the locale header of the time it was made, so each request makes
      // a new client. The Nuxt context is not available after an await.
      const sdk = useMedusa()
      const { listProducts } = useCatalog()
      try {
        let categories = current.categories
        if (categories === undefined) {
          const { products } = await sdk.store.product.list({
            id: current.productId,
            fields: "id,*categories",
            limit: 1,
          })
          categories = products[0]?.categories
        }
        const first = categories?.[0]
        if (!first) {
          return EMPTY_RESULT
        }

        const { products } = await listProducts({
          categoryId: first.id,
          limit: RELATED_FETCH_LIMIT,
        })
        const skip = new Set([current.productId, ...current.excludeIds])
        const related = products
          .filter((product) => !skip.has(product.id))
          .filter((product) => (product.variants ?? []).some(isPurchasable))
          .slice(0, RELATED_LIMIT)
        return {
          products: related,
          category: { id: first.id, name: first.name, handle: first.handle },
        }
      } catch {
        // The section does not show when the backend does not answer.
        return EMPTY_RESULT
      }
    },
    { default: () => EMPTY_RESULT, watch: [() => JSON.stringify(source()), locale] }
  )

  const products = computed(() => data.value?.products ?? [])
  const category = computed(() => data.value?.category ?? null)

  return { products, category, pending }
}
