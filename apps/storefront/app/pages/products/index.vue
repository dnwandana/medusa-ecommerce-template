<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const catalog = useCatalog()

const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page ?? "1"), 10) || 1))

// The server render has the status "success". The status is "pending" only while a page change on the client loads.
const { data, error, status } = await useAsyncData(
  () => `products:${locale.value}:${page.value}`,
  () => catalog.listProducts({ offset: (page.value - 1) * PAGE_SIZE })
)
const { data: categories } = await useAsyncData(
  () => `categories:${locale.value}`,
  () => catalog.listCategories()
)

useHead({ title: () => t("products.title") })
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-8">
    <h1 class="text-h1">{{ $t("products.title") }}</h1>
    <CategoryFilter v-if="categories?.length" :categories="categories" />
    <ProductGrid
      :products="data?.products ?? []"
      :empty-text="$t('products.empty')"
      :loading="status === 'pending'"
      :error="!!error"
    />
    <CatalogPagination :page="page" :count="data?.count ?? 0" path="/products" />
  </div>
</template>
