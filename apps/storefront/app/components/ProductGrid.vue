<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { PackageSearch } from "@lucide/vue"

defineProps<{
  products: HttpTypes.StoreProduct[]
  emptyText: string
  // Shows the Skeleton grid in place of the cards.
  loading?: boolean
  // Shows the destructive Alert in place of the cards.
  error?: boolean
  // The number of Skeleton cards. The default is 12, one catalog page.
  skeletons?: number
}>()

// The Skeleton grid and the card grid use the same classes, so the page does not move when the cards come.
const GRID_CLASS = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
</script>

<template>
  <Alert v-if="error" variant="destructive">
    <AlertDescription>{{ $t("common.error") }}</AlertDescription>
  </Alert>
  <div v-else-if="loading" :class="GRID_CLASS">
    <div v-for="index in skeletons ?? 12" :key="index" class="flex flex-col gap-2">
      <AspectRatio :ratio="3 / 4">
        <Skeleton class="size-full rounded-lg" />
      </AspectRatio>
      <Skeleton class="h-4 w-3/4" />
      <Skeleton class="h-4 w-1/3" />
    </div>
  </div>
  <Empty v-else-if="!products.length">
    <EmptyHeader>
      <EmptyMedia>
        <PackageSearch class="size-6" aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>{{ emptyText }}</EmptyTitle>
    </EmptyHeader>
  </Empty>
  <div v-else :class="GRID_CLASS">
    <ProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>
