<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

// showShipping is true only after the customer saves a shipping option.
// Before that, cart.total has no shipping, so the summary hides the total.
defineProps<{ cart: HttpTypes.StoreCart; showShipping: boolean }>()
</script>

<template>
  <Card class="rounded-xl">
    <CardHeader>
      <CardTitle>{{ $t("checkout.summary") }}</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <ul class="flex flex-col gap-4">
        <li v-for="item in cart.items ?? []" :key="item.id" class="flex items-start gap-3">
          <div class="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-sm bg-backdrop-sand">
            <img
              v-if="item.thumbnail"
              :src="item.thumbnail"
              :alt="item.product_title ?? ''"
              class="size-full object-cover"
            />
          </div>
          <div class="flex min-w-0 flex-col">
            <p class="font-medium">{{ item.product_title }}</p>
            <p v-if="item.variant_title" class="text-body-sm text-muted-foreground">
              {{ item.variant_title }}
            </p>
            <p class="text-body-sm">{{ item.quantity }} × {{ formatPrice(item.unit_price) }}</p>
          </div>
        </li>
      </ul>

      <Separator />

      <dl class="grid grid-cols-2 gap-2">
        <dt>{{ $t("cart.subtotal") }}</dt>
        <dd class="text-right">{{ formatPrice(cart.item_subtotal) }}</dd>
        <template v-if="showShipping">
          <dt>{{ $t("cart.shipping") }}</dt>
          <dd class="text-right">{{ formatPrice(cart.shipping_total) }}</dd>
          <!-- A border and not a Separator, because a dl can hold only dt, dd, and div elements. -->
          <dt class="border-t border-border pt-2 font-semibold">{{ $t("cart.total") }}</dt>
          <dd class="border-t border-border pt-2 text-right text-price-lg">
            {{ formatPrice(cart.total) }}
          </dd>
        </template>
      </dl>
    </CardContent>
  </Card>
</template>
