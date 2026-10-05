<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

defineProps<{ order: HttpTypes.StoreOrder }>()
</script>

<template>
  <section class="flex flex-col gap-6">
    <h2 class="text-xl font-semibold">{{ $t("order.number", { id: order.display_id }) }}</h2>

    <div class="flex flex-col gap-2">
      <h3 class="font-medium">{{ $t("order.items") }}</h3>
      <ul class="divide-y border-y">
        <li
          v-for="item in order.items ?? []"
          :key="item.id"
          class="flex flex-wrap items-center gap-4 py-3"
        >
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="font-medium">{{ item.product_title }}</span>
            <span class="text-sm text-muted-foreground">{{ item.variant_title }}</span>
          </div>
          <span class="text-sm">{{ item.quantity }} × {{ formatPrice(item.unit_price) }}</span>
        </li>
      </ul>
    </div>

    <dl class="ml-auto grid w-full max-w-sm grid-cols-2 gap-2">
      <dt>{{ $t("cart.subtotal") }}</dt>
      <dd class="text-right">
        <span data-testid="order-subtotal">{{ formatPrice(order.item_subtotal) }}</span>
      </dd>
      <dt>{{ $t("cart.shipping") }}</dt>
      <dd class="text-right">
        <span data-testid="order-shipping">{{ formatPrice(order.shipping_total) }}</span>
      </dd>
      <dt class="font-semibold">{{ $t("cart.total") }}</dt>
      <dd class="text-right font-semibold">
        <span data-testid="order-total">{{ formatPrice(order.total) }}</span>
      </dd>
    </dl>

    <div v-if="order.shipping_address" class="flex flex-col gap-1">
      <h3 class="font-medium">{{ $t("order.shippingAddress") }}</h3>
      <p>{{ order.shipping_address.first_name }} {{ order.shipping_address.last_name }}</p>
      <p>{{ order.shipping_address.address_1 }}</p>
      <p>
        {{ order.shipping_address.city }}, {{ order.shipping_address.province }}
        {{ order.shipping_address.postal_code }}
      </p>
      <p v-if="order.shipping_address.phone">{{ order.shipping_address.phone }}</p>
    </div>
  </section>
</template>
