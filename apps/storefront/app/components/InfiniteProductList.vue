<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import type { RouteLocationRaw } from "vue-router"
import { PAGE_SIZE } from "~/composables/useCatalog"

const props = defineProps<{
  products: HttpTypes.StoreProduct[]
  count: number
  // The first page loads.
  loading: boolean
  // The first page did not load.
  error: boolean
  // A next page loads.
  loadingMore: boolean
  // The last next page did not load.
  loadMoreError: boolean
  // The URL of the next page, or null after the last page.
  nextPageTo: RouteLocationRaw | null
  emptyText: string
  emptyBody?: string
  emptyAction?: { label: string; to: string }
}>()

const emit = defineEmits<{ "load-more": []; retry: [] }>()

const { t } = useI18n()

const mounted = ref(false)
const sentinel = ref<HTMLElement | null>(null)
const loadedMessage = ref("")
let observer: IntersectionObserver | null = null

const canLoadMore = computed(
  () =>
    props.nextPageTo !== null &&
    !props.loading &&
    !props.error &&
    !props.loadingMore &&
    !props.loadMoreError
)
// A list of one page needs no end line.
const atEnd = computed(
  () =>
    props.nextPageTo === null &&
    props.products.length >= props.count &&
    props.count > PAGE_SIZE &&
    !props.loading &&
    !props.error
)

function observe(): void {
  if (!observer || !sentinel.value) {
    return
  }
  // A new observe call reports the current state, so a sentinel that stays in view after a
  // fetch asks for the next page again.
  observer.unobserve(sentinel.value)
  observer.observe(sentinel.value)
}

onMounted(() => {
  // The link stays visible with no script. With a script, the sentinel loads the next page.
  mounted.value = true
  if (typeof IntersectionObserver === "undefined") {
    return
  }
  // The margin starts the next fetch before the shopper reaches the end of the grid.
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && canLoadMore.value) {
        emit("load-more")
      }
    },
    { rootMargin: "600px 0px" }
  )
  observe()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

watch(
  () => props.loadingMore,
  (loadingMore, wasLoading) => {
    if (wasLoading && !loadingMore) {
      observe()
    }
  }
)

// Only a longer list is a fetch of more products. A new filter makes the list shorter.
watch(
  () => props.products.length,
  (length, oldLength) => {
    if (length > oldLength) {
      const added = length - oldLength
      loadedMessage.value = t("listing.loaded", { count: added }, added)
    }
  }
)
</script>

<template>
  <div class="flex flex-col">
    <ProductGrid
      :products="products"
      :empty-text="emptyText"
      :empty-body="emptyBody"
      :empty-action="emptyAction"
      :loading="loading"
      :error="error"
      @retry="emit('retry')"
    />
    <div ref="sentinel" aria-hidden="true" class="h-px" />
    <div class="flex flex-col items-center gap-4 pt-12 empty:hidden">
      <NuxtLinkLocale
        v-if="nextPageTo !== null && !loading && !error"
        data-testid="next-page"
        :to="nextPageTo"
        class="text-body-sm underline underline-offset-4"
        :class="mounted ? 'hidden' : ''"
      >
        {{ $t("listing.nextPage") }}
      </NuxtLinkLocale>
      <div v-if="loadingMore" class="flex w-full max-w-60 flex-col items-center gap-3">
        <ProgressRule :label="$t('listing.loadingMore')" />
        <p class="text-caption text-muted-foreground" aria-hidden="true">
          {{ $t("listing.loadingMore") }}
        </p>
      </div>
      <template v-else-if="loadMoreError">
        <p class="text-body-sm text-muted-foreground" role="alert">
          {{ $t("listing.loadFailed") }}
        </p>
        <Button
          type="button"
          variant="outline"
          data-testid="load-more-retry"
          @click="emit('load-more')"
        >
          {{ $t("common.retry") }}
        </Button>
      </template>
      <p v-else-if="atEnd" class="text-caption text-muted-foreground">
        {{ $t("listing.end", { count }) }}
      </p>
    </div>
    <div aria-live="polite" class="sr-only">{{ loadedMessage }}</div>
  </div>
</template>
