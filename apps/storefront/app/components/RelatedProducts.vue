<script setup lang="ts">
import type { RelatedSource } from "~/composables/useRelatedProducts"

const props = defineProps<{ sourceKey: string; source: RelatedSource | null }>()

// ProductCard only reads the settings, so the section loads them.
const storefront = useStorefront()
await useAsyncData("storefront-settings", () => storefront.ensureSettings())

const { products, category, pending } = useRelatedProducts(props.sourceKey, () => props.source)

const titleId = useId()
const SKELETON_COUNT = 4

// From 1024 px the cards are a grid of 4. Below, they are a row that scrolls sideways, and each
// card is 42% wide, so a part of the third card shows that the row scrolls.
const LIST_CLASS =
  "-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:-mx-12 md:px-12 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-8 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
const ITEM_CLASS = "w-[42%] shrink-0 snap-start lg:w-auto"
</script>

<template>
  <section
    v-if="products.length || pending"
    :aria-labelledby="titleId"
    class="flex flex-col gap-6 md:gap-12"
  >
    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h2 :id="titleId" class="text-h2">{{ $t("product.related") }}</h2>
      <NuxtLinkLocale
        v-if="category"
        :to="`/categories/${category.handle}`"
        class="text-body-sm underline underline-offset-4 hover:text-muted-foreground"
      >
        {{ $t("product.viewAllIn", { category: category.name }) }}
      </NuxtLinkLocale>
    </div>

    <ul v-if="products.length" :class="LIST_CLASS">
      <li v-for="product in products" :key="product.id" :class="ITEM_CLASS">
        <ProductCard :product="product" />
      </li>
    </ul>
    <ul v-else :class="LIST_CLASS" aria-hidden="true">
      <li
        v-for="index in SKELETON_COUNT"
        :key="index"
        data-testid="related-skeleton"
        :class="[ITEM_CLASS, 'flex flex-col gap-4']"
      >
        <div class="relative" style="aspect-ratio: 4 / 5">
          <Skeleton class="absolute inset-0" />
        </div>
        <div class="flex flex-col gap-2">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-1/3" />
        </div>
      </li>
    </ul>
  </section>
</template>
