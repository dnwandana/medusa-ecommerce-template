<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const catalog = useCatalog()

const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page ?? "1"), 10) || 1))

const { data, error } = await useAsyncData(
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
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ $t("products.title") }}</h1>

    <div v-if="categories?.length" class="flex flex-wrap items-center gap-3 text-sm">
      <span class="text-muted-foreground">{{ $t("products.categories") }}</span>
      <NuxtLinkLocale
        v-for="category in categories"
        :key="category.id"
        :to="`/categories/${category.handle}`"
        class="underline-offset-4 hover:underline"
      >
        {{ category.name }}
      </NuxtLinkLocale>
    </div>

    <p v-if="error" role="alert">{{ $t("common.error") }}</p>
    <p v-else-if="!data?.products.length">{{ $t("products.empty") }}</p>
    <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <ProductCard v-for="product in data.products" :key="product.id" :product="product" />
    </div>

    <div class="flex justify-between">
      <NuxtLinkLocale v-if="page > 1" :to="{ path: '/products', query: { page: page - 1 } }">
        {{ $t("common.previous") }}
      </NuxtLinkLocale>
      <span v-else />
      <NuxtLinkLocale
        v-if="data && page * PAGE_SIZE < data.count"
        :to="{ path: '/products', query: { page: page + 1 } }"
      >
        {{ $t("common.next") }}
      </NuxtLinkLocale>
    </div>
  </div>
</template>
