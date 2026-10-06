<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

defineProps<{ order: HttpTypes.StoreOrder }>()
</script>

<template>
  <div class="grid items-start gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <Card>
      <CardHeader>
        <CardTitle><h2>{{ $t("order.number", { id: order.display_id }) }}</h2></CardTitle>
      </CardHeader>
      <CardContent class="pt-2 md:pt-2">
        <h3 class="sr-only">{{ $t("order.items") }}</h3>
        <template v-for="(item, index) in order.items ?? []" :key="item.id">
          <Separator v-if="index > 0" />
          <Item>
            <ItemContent>
              <ItemTitle>{{ item.product_title }}</ItemTitle>
              <ItemDescription>{{ item.variant_title }}</ItemDescription>
            </ItemContent>
            <ItemActions class="text-body-sm">
              {{ item.quantity }} × {{ formatPrice(item.unit_price) }}
            </ItemActions>
          </Item>
        </template>
      </CardContent>
    </Card>

    <div class="flex flex-col gap-6">
      <Card>
        <CardContent>
          <dl class="grid grid-cols-2 items-baseline gap-3">
            <dt>{{ $t("cart.subtotal") }}</dt>
            <dd class="text-right text-price">
              <span data-testid="order-subtotal">{{ formatPrice(order.item_subtotal) }}</span>
            </dd>
            <dt>{{ $t("cart.shipping") }}</dt>
            <dd class="text-right text-price">
              <span data-testid="order-shipping">{{ formatPrice(order.shipping_total) }}</span>
            </dd>
            <!-- A border and not a Separator, because a dl can hold only dt, dd, and div elements. -->
            <dt class="border-t border-border pt-3 font-semibold">{{ $t("cart.total") }}</dt>
            <dd class="border-t border-border pt-3 text-right text-price-lg">
              <span data-testid="order-total">{{ formatPrice(order.total) }}</span>
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card v-if="order.shipping_address">
        <CardHeader>
          <CardTitle><h2>{{ $t("order.shippingAddress") }}</h2></CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-1">
          <p>{{ order.shipping_address.first_name }} {{ order.shipping_address.last_name }}</p>
          <p>{{ order.shipping_address.address_1 }}</p>
          <p>
            {{ order.shipping_address.city }}, {{ order.shipping_address.province }}
            {{ order.shipping_address.postal_code }}
          </p>
          <p v-if="order.shipping_address.phone" class="text-muted-foreground">
            {{ order.shipping_address.phone }}
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
