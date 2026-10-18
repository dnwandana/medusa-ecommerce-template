import type { HttpTypes } from "@medusajs/types"
import type { ComputedRef, Ref } from "vue"

export const SEARCH_MIN_LENGTH = 2
export const SEARCH_DEBOUNCE_MS = 300
export const SEARCH_SUGGESTION_LIMIT = 5

// Returns the path of the search page for a text, or null for an empty text. The caller passes
// the path to localePath.
export function searchPath(query: string): string | null {
  const text = query.trim()
  return text === "" ? null : `/search?q=${encodeURIComponent(text)}`
}

// Returns the product suggestions for a search text. Each caller has its own state, so two search
// boxes do not share results.
export function useSearchSuggestions(query: Ref<string>): {
  products: Ref<HttpTypes.StoreProduct[]>
  pending: Ref<boolean>
  active: ComputedRef<boolean>
} {
  // The Nuxt context is not available in the timer callback. Get the catalog here.
  const { listProducts } = useCatalog()
  const products = ref<HttpTypes.StoreProduct[]>([])
  const pending = ref(false)
  const text = computed(() => query.value.trim())
  const active = computed(() => text.value.length >= SEARCH_MIN_LENGTH)

  let timer: ReturnType<typeof setTimeout> | undefined
  // Each search gets a new number. An answer with an older number is ignored.
  let latest = 0

  async function search(value: string): Promise<void> {
    const request = ++latest
    let found: HttpTypes.StoreProduct[] = []
    try {
      found = (await listProducts({ q: value, limit: SEARCH_SUGGESTION_LIMIT })).products
    } catch {
      // The search box shows no suggestion when the backend does not answer.
    }
    if (request === latest) {
      products.value = found
      pending.value = false
    }
  }

  watch(text, (value) => {
    clearTimeout(timer)
    if (value.length < SEARCH_MIN_LENGTH) {
      latest++
      products.value = []
      pending.value = false
      return
    }
    // One fast typist makes one request, not one request for each key.
    pending.value = true
    timer = setTimeout(() => void search(value), SEARCH_DEBOUNCE_MS)
  })

  onScopeDispose(() => {
    clearTimeout(timer)
    latest++
  })

  return { products, pending, active }
}
