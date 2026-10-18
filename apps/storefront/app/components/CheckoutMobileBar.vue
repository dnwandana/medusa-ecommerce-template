<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { ChevronDown, ShoppingBag } from "@lucide/vue"

const props = defineProps<{ cart: HttpTypes.StoreCart; showShipping: boolean }>()

const open = ref(false)

// The same total as the summary. Before a delivery method is saved, cart.total has no delivery.
const total = computed(() =>
  formatPrice(props.showShipping ? props.cart.total : props.cart.item_total)
)
</script>

<template>
  <div class="border-b border-border bg-secondary lg:hidden">
    <button
      type="button"
      class="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-foreground outline-none focus-visible:shadow-[var(--focus-ring)]"
      :aria-expanded="open ? 'true' : 'false'"
      aria-controls="checkout-mobile-summary"
      @click="open = !open"
    >
      <span class="flex items-center gap-2 text-nav">
        <ShoppingBag class="size-[18px]" aria-hidden="true" />
        {{ open ? $t("checkout.hideSummary") : $t("checkout.showSummary") }}
        <ChevronDown
          class="size-4 transition-transform duration-250"
          :class="open ? 'rotate-180' : ''"
          aria-hidden="true"
        />
      </span>
      <span class="text-price-lg">{{ total }}</span>
    </button>
    <CheckoutSummary
      v-if="open"
      id="checkout-mobile-summary"
      :cart="props.cart"
      :show-shipping="props.showShipping"
      :heading="false"
      class="px-4 pt-1 pb-5"
    />
  </div>
</template>
