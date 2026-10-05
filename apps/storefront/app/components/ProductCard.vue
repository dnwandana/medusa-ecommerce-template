<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

const props = defineProps<{ product: HttpTypes.StoreProduct }>()

// The lowest price of the variants that have a price. It is null when no variant has a price.
const lowestPrice = computed<number | null>(() => {
  const amounts = (props.product.variants ?? [])
    .map((variant) => variant.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number" && Number.isFinite(amount))
  return amounts.length > 0 ? Math.min(...amounts) : null
})
</script>

<template>
  <NuxtLinkLocale :to="`/products/${product.handle}`" class="block">
    <Card class="h-full pt-0">
      <img
        v-if="product.thumbnail"
        :src="product.thumbnail"
        :alt="product.title"
        loading="lazy"
        class="aspect-square w-full object-cover"
      />
      <div v-else class="aspect-square w-full bg-muted" />
      <CardContent class="flex flex-col gap-1">
        <span class="font-medium">{{ product.title }}</span>
        <span class="text-muted-foreground">{{ formatPrice(lowestPrice) }}</span>
      </CardContent>
    </Card>
  </NuxtLinkLocale>
</template>
