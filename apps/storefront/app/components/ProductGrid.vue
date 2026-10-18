<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { PackageSearch } from "@lucide/vue"

defineProps<{
  products: HttpTypes.StoreProduct[]
  // The title of the empty state.
  emptyText: string
  // The line under the empty title.
  emptyBody?: string
  // The link button of the empty state.
  emptyAction?: { label: string; to: string }
  // Shows the Skeleton grid in place of the cards.
  loading?: boolean
  // Shows the destructive Alert and the "Try again" button in place of the cards.
  error?: boolean
  // The number of Skeleton cards. The default is 12, one catalog page.
  skeletons?: number
}>()

defineEmits<{ retry: [] }>()

// The cards read the badge rules and the colours from the settings. A failed request keeps the
// default rules, so the cards still show.
const storefront = useStorefront()
await useAsyncData("storefront-settings", () => storefront.ensureSettings())

// The Skeleton grid and the card grid use the same classes, so the page does not move when the cards come.
const GRID_CLASS =
  "grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-12"
</script>

<template>
  <div v-if="error" class="flex flex-col items-start gap-4">
    <Alert variant="destructive">
      <AlertDescription>{{ $t("common.error") }}</AlertDescription>
    </Alert>
    <Button type="button" variant="outline" @click="$emit('retry')">
      {{ $t("common.retry") }}
    </Button>
  </div>
  <div v-else-if="loading" :class="GRID_CLASS">
    <div v-for="index in skeletons ?? 12" :key="index" class="flex flex-col gap-4">
      <div data-testid="skeleton-photo" class="relative" style="aspect-ratio: 4 / 5">
        <Skeleton class="absolute inset-0" />
      </div>
      <div class="flex flex-col gap-2">
        <Skeleton class="h-4 w-3/4" />
        <Skeleton class="h-4 w-1/3" />
      </div>
    </div>
  </div>
  <Empty v-else-if="!products.length">
    <EmptyHeader>
      <EmptyMedia shape="circle">
        <PackageSearch class="size-6" :stroke-width="1.5" aria-hidden="true" />
      </EmptyMedia>
      <EmptyTitle>{{ emptyText }}</EmptyTitle>
      <EmptyDescription v-if="emptyBody">{{ emptyBody }}</EmptyDescription>
    </EmptyHeader>
    <EmptyContent v-if="emptyAction">
      <Button variant="outline" as-child>
        <NuxtLinkLocale :to="emptyAction.to">{{ emptyAction.label }}</NuxtLinkLocale>
      </Button>
    </EmptyContent>
  </Empty>
  <div v-else :class="GRID_CLASS">
    <ProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>
