<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const catalog = useCatalog()

const handle = computed(() => String(route.params.handle))

const { data: product } = await useAsyncData(
  () => `product:${locale.value}:${handle.value}`,
  () => catalog.getProductByHandle(handle.value)
)

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: t("products.notFound"), fatal: true })
}

useHead({ title: () => product.value?.title ?? "" })
</script>

<template>
  <div v-if="product" class="flex flex-col gap-10">
    <div class="grid gap-8 md:grid-cols-2">
      <div>
        <img
          v-if="product.thumbnail"
          :src="product.thumbnail"
          :alt="product.title"
          class="aspect-square w-full rounded object-cover"
        />
        <div v-else class="aspect-square w-full rounded bg-muted" />
      </div>
      <div class="flex flex-col gap-4">
        <h1 class="text-2xl font-semibold">{{ product.title }}</h1>
        <p v-if="product.description" class="whitespace-pre-line text-muted-foreground">
          {{ product.description }}
        </p>
        <ProductPurchase :product="product" />
      </div>
    </div>

    <ReviewList :product-id="product.id" />
  </div>
</template>
