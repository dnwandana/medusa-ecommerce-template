<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

const props = defineProps<{ item: HttpTypes.StoreCartLineItem; disabled?: boolean }>()
const emit = defineEmits<{ update: [quantity: number]; remove: [] }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-4 border-b py-4">
    <img
      v-if="props.item.thumbnail"
      :src="props.item.thumbnail"
      :alt="props.item.product_title ?? ''"
      class="size-16 rounded object-cover"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <span class="font-medium">{{ props.item.product_title }}</span>
      <span class="text-sm text-muted-foreground">{{ props.item.variant_title }}</span>
    </div>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="size-8 rounded border disabled:opacity-50"
        :aria-label="$t('cart.decrease')"
        :disabled="props.disabled"
        @click="emit('update', props.item.quantity - 1)"
      >
        −
      </button>
      <span data-testid="quantity" class="w-6 text-center">{{ props.item.quantity }}</span>
      <button
        type="button"
        class="size-8 rounded border disabled:opacity-50"
        :aria-label="$t('cart.increase')"
        :disabled="props.disabled"
        @click="emit('update', props.item.quantity + 1)"
      >
        +
      </button>
    </div>
    <span class="w-28 text-right">{{ formatPrice(props.item.unit_price * props.item.quantity) }}</span>
    <Button variant="ghost" :disabled="props.disabled" @click="emit('remove')">
      {{ $t("cart.remove") }}
    </Button>
  </div>
</template>
