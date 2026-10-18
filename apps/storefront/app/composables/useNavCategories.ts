import type { ComputedRef, Ref } from "vue"

export type NavCategory = { id: string; name: string; handle: string }

// Returns the top-level categories for the header, the mobile menu and the error page.
// The fixed key lets all callers share one request.
export function useNavCategories(): {
  categories: ComputedRef<NavCategory[]>
  pending: Ref<boolean>
} {
  const { locale } = useI18n()

  // The caller does not await, so the request does not block the page render.
  // "defer" lets a second caller join the running request instead of a new one.
  // The watch loads the names again after a language change.
  const { data, pending } = useAsyncData(
    "nav-categories",
    async () => {
      // The SDK client keeps the locale header of the time it was made. The header stays mounted
      // after a language change, so each request makes a new client.
      const { listCategories } = useCatalog()
      try {
        return await listCategories()
      } catch {
        // The navigation shows no categories when the backend does not answer.
        return []
      }
    },
    { default: () => [], dedupe: "defer", watch: [locale] }
  )

  const categories = computed<NavCategory[]>(() =>
    (data.value ?? [])
      .filter((category) => category.parent_category_id === null)
      .map((category) => ({ id: category.id, name: category.name, handle: category.handle }))
  )

  return { categories, pending }
}
