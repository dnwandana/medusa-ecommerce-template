<script setup lang="ts">
import { Search } from "@lucide/vue"
import { createReusableTemplate } from "@vueuse/core"
import { searchPath } from "~/composables/useSearchSuggestions"

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const catalog = useCatalog()

const text = computed(() => String(route.query.q ?? "").trim())
const hasText = computed(() => text.value !== "")

// The form keeps its own text, so the shopper can change it before a new search.
const draft = ref(text.value)
watch(text, (value) => {
  draft.value = value
})

// The "New in" block of a search with no match. A page with no text makes no request.
const { data: newIn } = useLazyAsyncData(
  () => `search-new-in:${locale.value}`,
  () => (hasText.value ? catalog.listProducts({ limit: 4 }) : Promise.resolve(null)),
  { watch: [hasText] }
)

// The form shows above the listing, or alone when the page has no text.
const [DefineSearchForm, SearchForm] = createReusableTemplate()

async function submit(): Promise<void> {
  const path = searchPath(draft.value)
  if (path) {
    await navigateTo(localePath(path))
  }
}

useSeoMeta({ robots: "noindex" })
useHead({ title: () => t("search.title") })
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- The definition is inside the root element, so the page keeps one root for the transition. -->
    <DefineSearchForm>
      <form role="search" class="w-full md:max-w-sm" @submit.prevent="submit">
        <div class="relative">
          <Search
            class="pointer-events-none absolute top-1/2 left-0 size-4 -translate-y-1/2"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <Input
            v-model="draft"
            type="search"
            enterkeyhint="search"
            class="pl-7"
            :aria-label="$t('search.label')"
            :placeholder="$t('search.placeholder')"
          />
        </div>
      </form>
    </DefineSearchForm>
    <template v-if="!hasText">
      <h1 class="text-h1">{{ $t("search.title") }}</h1>
      <SearchForm />
    </template>

    <CatalogListing
      v-else
      :scope="{ q: text }"
      :empty-text="t('search.noResultsFor', { query: text })"
    >
      <template #top="{ count }">
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div class="flex flex-col gap-3">
              <p class="text-eyebrow text-muted-foreground">{{ $t("search.title") }}</p>
              <h1 class="text-h1">
                {{
                  count > 0
                    ? $t("search.resultsFor", { query: text })
                    : $t("search.noResultsFor", { query: text })
                }}
              </h1>
            </div>
            <SearchForm />
          </div>
          <p class="border-y border-border py-4 text-body-sm text-muted-foreground tabular-nums">
            {{ $t("search.count", { count }, count) }}
          </p>
        </div>
      </template>
      <template #empty>
        <div class="flex flex-col gap-12">
          <div class="flex flex-col items-start gap-6">
            <p class="text-body">{{ $t("search.noMatch", { query: text }) }}</p>
            <Button variant="outline" as-child>
              <NuxtLinkLocale to="/products">{{ $t("home.viewAll") }}</NuxtLinkLocale>
            </Button>
          </div>
          <section v-if="newIn?.products.length" class="flex flex-col gap-6">
            <h2 class="text-h3">{{ $t("search.newIn") }}</h2>
            <ProductGrid :products="newIn.products" :empty-text="$t('products.empty')" />
          </section>
        </div>
      </template>
    </CatalogListing>
  </div>
</template>
