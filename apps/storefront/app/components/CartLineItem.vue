<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { ImageOff, Minus, Plus, Trash2 } from "@lucide/vue"

const props = defineProps<{ item: HttpTypes.StoreCartLineItem; disabled?: boolean }>()
const emit = defineEmits<{ update: [quantity: number]; remove: [] }>()
</script>

<template>
  <div
    class="grid grid-cols-[80px_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-3 py-5 [grid-template-areas:'thumb_info_price'_'thumb_qty_remove'] md:grid-cols-[96px_minmax(0,1fr)_auto_128px_44px] md:items-center md:gap-6 md:py-6 md:[grid-template-areas:'thumb_info_qty_price_remove']"
  >
    <div class="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-sm bg-backdrop-sand [grid-area:thumb]">
      <img
        v-if="props.item.thumbnail"
        :src="props.item.thumbnail"
        :alt="props.item.product_title ?? ''"
        class="size-full object-cover"
      />
      <ImageOff v-else class="size-6 text-icon-subtle" aria-hidden="true" />
    </div>
    <div class="flex min-w-0 flex-col gap-0.5 [grid-area:info]">
      <span class="font-medium">{{ props.item.product_title }}</span>
      <span class="text-body-sm text-muted-foreground">{{ props.item.variant_title }}</span>
      <span class="text-body-sm">{{ formatPrice(props.item.unit_price) }}</span>
    </div>
    <div class="flex items-center gap-2 self-end [grid-area:qty] md:self-auto">
      <Button
        variant="outline"
        size="icon-sm"
        :aria-label="$t('cart.decrease')"
        :disabled="props.disabled"
        @click="emit('update', props.item.quantity - 1)"
      >
        <Minus aria-hidden="true" />
      </Button>
      <span data-testid="quantity" class="w-8 text-center">{{ props.item.quantity }}</span>
      <Button
        variant="outline"
        size="icon-sm"
        :aria-label="$t('cart.increase')"
        :disabled="props.disabled"
        @click="emit('update', props.item.quantity + 1)"
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
    <span class="text-right text-price [grid-area:price]">
      {{ formatPrice(props.item.unit_price * props.item.quantity) }}
    </span>
    <div class="justify-self-end self-end [grid-area:remove] md:self-auto">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button variant="ghost" size="icon" :disabled="props.disabled" @click="emit('remove')">
            <Trash2 aria-hidden="true" />
            <span class="sr-only">{{ $t("cart.remove") }}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{{ $t("cart.remove") }}</TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>
