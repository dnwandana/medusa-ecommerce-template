<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { SlidersHorizontal } from "@lucide/vue"
import {
  EMPTY_FILTER_VALUES,
  type CatalogFilterValues,
  type ListingScope,
} from "~/composables/useCatalogListing"
import {
  activeFilterCount,
  clearFilters,
  parseCatalogQuery,
  toCatalogQuery,
  type CatalogState,
} from "~/utils/catalogQuery"

const props = defineProps<{
  scope: ListingScope
  emptyText: string
  emptyBody?: string
  emptyAction?: { label: string; to: string }
  // "All" and the category links of the filter sheet.
  categories?: { id: string; name: string; to: string; current: boolean }[]
}>()

const emit = defineEmits<{
  "first-thumbnail": [url: string | null]
}>()

const slots = defineSlots<{
  top?(props: { count: number }): unknown
  empty?(): unknown
}>()

// A reload of a deep page loads the pages before it too. The limit keeps that request small.
const MAX_PAGES = 10

type FilterData = { scopeKey: string; values: CatalogFilterValues; priceLimits: number[] }
type ListData = { products: HttpTypes.StoreProduct[]; count: number; pages: number }

const route = useRoute()
const router = useRouter()
const { locale } = useI18n()
const listing = useCatalogListing()
const storefront = useStorefront()

const state = computed(() => parseCatalogQuery(route.query))
const scopeKey = computed(
  () => `${locale.value}:${props.scope.categoryId ?? ""}:${props.scope.q ?? ""}`
)
// The page is not a part of the key, so the URL change after "Load more" does not load again.
const stateKey = computed(() =>
  new URLSearchParams(toCatalogQuery({ ...state.value, page: 1 })).toString()
)

// The filter values and the list of a new scope load at the same time. The list waits for the
// filter values of its scope, because they turn the URL keys into ids.
let pendingFilters: { scopeKey: string; promise: Promise<FilterData> } | null = null

function loadFilters(): Promise<FilterData> {
  const key = scopeKey.value
  if (pendingFilters?.scopeKey !== key) {
    const promise = Promise.all([listing.listFilters(props.scope), storefront.ensureSettings()])
      .then(([values, settings]) => ({ scopeKey: key, values, priceLimits: settings.price_limits }))
      .finally(() => {
        if (pendingFilters?.promise === promise) {
          pendingFilters = null
        }
      })
    pendingFilters = { scopeKey: key, promise }
  }
  return pendingFilters.promise
}

const { data: filterData } = await useAsyncData(
  () => `filters:${scopeKey.value}`,
  () => loadFilters()
)

const values = computed(() => filterData.value?.values ?? EMPTY_FILTER_VALUES)
const priceLimits = computed(() => filterData.value?.priceLimits ?? [])

function currentFilters(): Promise<FilterData> {
  const loaded = filterData.value
  return loaded && loaded.scopeKey === scopeKey.value ? Promise.resolve(loaded) : loadFilters()
}

const {
  data: listData,
  status,
  error,
  refresh,
} = await useAsyncData(
  () => `listing:${scopeKey.value}:${stateKey.value}`,
  async (): Promise<ListData> => {
    const filters = await currentFilters()
    const current = state.value
    const pages = Math.min(current.page, MAX_PAGES)
    const results = await Promise.all(
      Array.from({ length: pages }, (_, index) =>
        listing.listPage(props.scope, current, filters.values, filters.priceLimits, index + 1)
      )
    )
    return {
      products: results.flatMap((result) => result.products),
      count: results[0]?.count ?? 0,
      pages,
    }
  }
)

// "Load more" adds to these values. New data of useAsyncData (a new filter) resets them.
const products = ref<HttpTypes.StoreProduct[]>([])
const count = ref(0)
const loadedPages = ref(0)
const loadingMore = ref(false)
const loadMoreError = ref(false)
const sheetOpen = ref(false)

watch(
  listData,
  (data) => {
    products.value = data?.products ?? []
    count.value = data?.count ?? 0
    loadedPages.value = data?.pages ?? 0
    loadMoreError.value = false
  },
  { immediate: true }
)

// The category page uses the photo for its link preview. The event fires in setup too, so the
// server HTML has the photo.
watch(
  () => products.value[0]?.thumbnail ?? null,
  (url) => emit("first-thumbnail", url),
  { immediate: true }
)

const loading = computed(() => status.value === "pending" && products.value.length === 0)
const failed = computed(() => !!error.value && products.value.length === 0)
const activeCount = computed(() => activeFilterCount(state.value))
const ready = computed(() => !loading.value && !failed.value && count.value === 0)
const noMatch = computed(() => ready.value && activeCount.value > 0)
const customEmpty = computed(() => ready.value && activeCount.value === 0 && !!slots.empty)

// The search page keeps its text in each URL that the listing makes.
function urlQuery(next: CatalogState): Record<string, string> {
  const query = toCatalogQuery(next)
  return props.scope.q ? { q: props.scope.q, ...query } : query
}

const nextPageTo = computed(() =>
  products.value.length < count.value
    ? { query: urlQuery({ ...state.value, page: loadedPages.value + 1 }) }
    : null
)

function changeState(next: CatalogState): void {
  router.push({ query: urlQuery(next) })
}

async function loadMore(): Promise<void> {
  if (loadingMore.value || nextPageTo.value === null) {
    return
  }
  const page = loadedPages.value + 1
  loadingMore.value = true
  loadMoreError.value = false
  try {
    const result = await listing.listPage(
      props.scope,
      state.value,
      values.value,
      priceLimits.value,
      page
    )
    products.value = [...products.value, ...result.products]
    count.value = result.count
    loadedPages.value = page
    // The URL keeps the page for the Back button. The key of the list has no page, so this
    // does not load the list again.
    await router.replace({ query: urlQuery({ ...state.value, page }) })
  } catch {
    loadMoreError.value = true
  } finally {
    loadingMore.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <slot name="top" :count="count" />
    <CatalogFilterBar
      :state="state"
      :values="values"
      :price-limits="priceLimits"
      :count="count"
      @update:state="changeState"
      @open-sheet="sheetOpen = true"
    />
    <Empty v-if="noMatch">
      <EmptyHeader>
        <EmptyMedia shape="circle">
          <SlidersHorizontal class="size-6" :stroke-width="1.5" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ $t("listing.noMatchTitle") }}</EmptyTitle>
        <EmptyDescription>{{ $t("listing.noMatchBody") }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent class="items-center gap-6">
        <ActiveFilterChips
          :state="state"
          :values="values"
          :price-limits="priceLimits"
          class="justify-center"
          @update:state="changeState"
        />
        <Button type="button" variant="outline" @click="changeState(clearFilters(state))">
          {{ $t("listing.clearAllFilters") }}
        </Button>
      </EmptyContent>
    </Empty>
    <slot v-else-if="customEmpty" name="empty" />
    <InfiniteProductList
      v-else
      :products="products"
      :count="count"
      :loading="loading"
      :error="failed"
      :loading-more="loadingMore"
      :load-more-error="loadMoreError"
      :next-page-to="nextPageTo"
      :empty-text="emptyText"
      :empty-body="emptyBody"
      :empty-action="emptyAction"
      @load-more="loadMore"
      @retry="refresh()"
    />
    <CatalogFilterSheet
      v-model:open="sheetOpen"
      :state="state"
      :values="values"
      :price-limits="priceLimits"
      :count="count"
      :categories="categories"
      @update:state="changeState"
    />
  </div>
</template>
