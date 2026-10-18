<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

// showShipping is true only after the customer saves a shipping option. Before that, cart.total
// has no delivery price, so the summary shows the item total and "Calculated at checkout".
const props = withDefaults(
  defineProps<{ cart: HttpTypes.StoreCart; showShipping: boolean; heading?: boolean }>(),
  { heading: true }
)

const savings = computed(() => cartSavings(props.cart.items))
</script>

<template>
  <!-- A div, not a section: the parent aside is the landmark and points to the h2. -->
  <div class="flex flex-col gap-6">
    <div v-if="props.heading" class="flex items-baseline justify-between gap-4">
      <h2 id="checkout-summary-title" class="text-h3">{{ $t("checkout.summary") }}</h2>
      <NuxtLinkLocale
        to="/cart"
        class="inline-flex min-h-11 items-center text-caption text-foreground underline decoration-1 underline-offset-4 outline-none hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)]"
      >
        {{ $t("checkout.editCart") }}
      </NuxtLinkLocale>
    </div>

    <ul class="flex flex-col gap-5">
      <li
        v-for="item in props.cart.items ?? []"
        :key="item.id"
        data-testid="summary-line"
        class="grid grid-cols-[64px_minmax(0,1fr)_auto] items-start gap-x-4"
      >
        <div class="relative">
          <div class="aspect-[3/4] w-16 overflow-hidden bg-muted">
            <img
              v-if="item.thumbnail"
              :src="item.thumbnail"
              :alt="item.product_title ?? ''"
              class="size-full object-cover"
            />
          </div>
          <span
            data-testid="quantity-bubble"
            role="img"
            :aria-label="$t('checkout.lineQuantity', { count: item.quantity })"
            class="absolute -top-1.5 -right-1.5 h-5 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] leading-5 font-semibold text-primary-foreground tabular-nums"
          >
            {{ item.quantity }}
          </span>
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="text-body-sm text-foreground">{{ item.product_title }}</p>
          <p v-if="item.variant_title" class="text-body-sm text-muted-foreground">
            {{ item.variant_title }}
          </p>
        </div>
        <p class="text-right text-price text-foreground">{{ formatPrice(item.subtotal) }}</p>
      </li>
    </ul>

    <div class="border-t border-border" />

    <TotalsBlock
      :subtotal="props.cart.item_subtotal ?? 0"
      :savings="savings"
      :delivery="props.showShipping ? props.cart.shipping_total : null"
      :total="(props.showShipping ? props.cart.total : props.cart.item_total) ?? 0"
    />
  </div>
</template>
