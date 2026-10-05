<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const catalog = useCatalog()

const handle = computed(() => String(route.params.handle))
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page ?? "1"), 10) || 1))

const { data: category } = await useAsyncData(
  () => `category:${locale.value}:${handle.value}`,
  () => catalog.getCategoryByHandle(handle.value)
)

if (!category.value) {
  throw createError({ statusCode: 404, statusMessage: t("categories.notFound"), fatal: true })
}

const { data, error } = await useAsyncData(
  () => `category-products:${locale.value}:${handle.value}:${page.value}`,
  () =>
    catalog.listProducts({
      categoryId: category.value!.id,
      offset: (page.value - 1) * PAGE_SIZE,
    })
)

useHead({ title: () => category.value?.name ?? "" })
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">{{ category?.name }}</h1>
      <p v-if="category?.description" class="text-muted-foreground">{{ category.description }}</p>
    </div>

    <p v-if="error" role="alert">{{ $t("common.error") }}</p>
    <p v-else-if="!data?.products.length">{{ $t("categories.empty") }}</p>
    <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <ProductCard v-for="product in data.products" :key="product.id" :product="product" />
    </div>

    <div class="flex justify-between">
      <NuxtLinkLocale
        v-if="page > 1"
        :to="{ path: `/categories/${handle}`, query: { page: page - 1 } }"
      >
        {{ $t("common.previous") }}
      </NuxtLinkLocale>
      <span v-else />
      <NuxtLinkLocale
        v-if="data && page * PAGE_SIZE < data.count"
        :to="{ path: `/categories/${handle}`, query: { page: page + 1 } }"
      >
        {{ $t("common.next") }}
      </NuxtLinkLocale>
    </div>
  </div>
</template>
