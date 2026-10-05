<script setup lang="ts">
const { t, locale } = useI18n()
const catalog = useCatalog()

const { data, error } = await useAsyncData(
  () => `home:${locale.value}`,
  () => catalog.listProducts({ limit: 8 })
)

useHead({ title: () => t("home.title") })
</script>

<template>
  <div class="flex flex-col gap-8">
    <section class="flex flex-col gap-2">
      <h1 class="text-3xl font-semibold">{{ $t("home.title") }}</h1>
      <p class="text-muted-foreground">{{ $t("home.subtitle") }}</p>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-semibold">{{ $t("home.newProducts") }}</h2>
      <p v-if="error" role="alert">{{ $t("common.error") }}</p>
      <p v-else-if="!data?.products.length">{{ $t("products.empty") }}</p>
      <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <ProductCard v-for="product in data.products" :key="product.id" :product="product" />
      </div>
      <div>
        <Button as-child>
          <NuxtLinkLocale to="/products">{{ $t("home.viewAll") }}</NuxtLinkLocale>
        </Button>
      </div>
    </section>
  </div>
</template>
