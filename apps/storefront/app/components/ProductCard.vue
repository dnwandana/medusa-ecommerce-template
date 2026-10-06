<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { ImageOff } from "@lucide/vue"

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
  <NuxtLinkLocale
    :to="`/products/${product.handle}`"
    class="group block rounded-lg focus-visible:shadow-focus"
  >
    <Card class="h-full overflow-hidden">
      <AspectRatio :ratio="3 / 4" class="bg-muted">
        <img
          v-if="product.thumbnail"
          :src="product.thumbnail"
          :alt="product.title"
          loading="lazy"
          class="size-full object-cover transition-transform group-hover:scale-[1.02]"
        />
        <div v-else class="flex size-full items-center justify-center">
          <ImageOff class="size-8 text-icon-subtle" aria-hidden="true" />
        </div>
      </AspectRatio>
      <CardContent class="flex flex-col gap-1">
        <span class="text-body-sm font-semibold md:text-base">{{ product.title }}</span>
        <span class="text-price">{{ formatPrice(lowestPrice) }}</span>
      </CardContent>
    </Card>
  </NuxtLinkLocale>
</template>
