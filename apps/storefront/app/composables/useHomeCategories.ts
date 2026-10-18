import type { ComputedRef, Ref } from "vue"

export type HomeCategory = { id: string; name: string; handle: string; image: string | null }

// Returns the categories that staff selected for the home page.
// The fixed key lets the footer and the home page share one request.
export function useHomeCategories(): {
  categories: ComputedRef<HomeCategory[]>
  pending: Ref<boolean>
} {
  const { locale } = useI18n()

  // The caller does not await, so the request does not block the page render.
  // "defer" lets a second caller join the running request instead of a new one.
  // The watch loads the names again after a language change.
  const { data, pending } = useAsyncData(
    "home-categories",
    async () => {
      // The SDK client keeps the locale header of the time it was made. The footer stays mounted
      // after a language change, so each request makes a new client.
      const sdk = useMedusa()
      try {
        const { categories } = await sdk.client.fetch<{ categories: HomeCategory[] }>(
          "/store/storefront/home-categories"
        )
        return categories
      } catch {
        // The footer never shows an error. It shows no categories.
        return []
      }
    },
    { default: () => [], dedupe: "defer", watch: [locale] }
  )

  const categories = computed<HomeCategory[]>(() => data.value ?? [])

  return { categories, pending }
}
