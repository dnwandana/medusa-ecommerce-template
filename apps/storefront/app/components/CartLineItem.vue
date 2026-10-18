<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { ImageOff } from "@lucide/vue"
import type { VariantStock } from "~/composables/useCatalog"

const props = withDefaults(
  defineProps<{
    item: HttpTypes.StoreCartLineItem
    stock?: VariantStock | null
    busy?: "update" | "remove" | null
    disabled?: boolean
  }>(),
  { stock: null, busy: null, disabled: false }
)
const emit = defineEmits<{ update: [quantity: number]; remove: []; move: [] }>()

const { settings } = useStorefront()

const product = computed(() => props.item.product_title ?? "")
const variant = computed(() => props.stock as HttpTypes.StoreProductVariant | null)
const limit = computed(() => stockLimit(variant.value))

// The plus button stops at the stock. A quantity above the stock (the stock went down after the
// add) keeps its value as the maximum, so the minus button still works.
const max = computed(() =>
  limit.value === null ? null : Math.max(limit.value, props.item.quantity)
)
const atLimit = computed(
  () => limit.value !== null && limit.value > 0 && props.item.quantity >= limit.value
)
const limited = computed(
  () =>
    !atLimit.value &&
    variant.value !== null &&
    isLimitedStock([variant.value], settings.value.low_stock_threshold)
)

const oldPrice = computed(() => {
  const compare = props.item.compare_at_unit_price
  return typeof compare === "number" && compare > props.item.unit_price ? compare : null
})

// The stepper shows the quantity of the cart. It never shows a value that the cart did not accept.
const quantity = computed({
  get: () => props.item.quantity,
  set: (value: number) => {
    if (value <= 0) {
      emit("remove")
    } else {
      emit("update", value)
    }
  },
})

const textButton =
  "inline-flex min-h-11 items-center gap-2 text-caption text-foreground underline decoration-1 underline-offset-4 outline-none hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:text-disabled-foreground"
</script>

<template>
  <div
    :aria-busy="props.busy === 'remove' ? 'true' : undefined"
    class="grid grid-cols-[96px_minmax(0,1fr)_auto] grid-rows-[auto_1fr] gap-x-4 border-b border-border py-6 transition-opacity duration-250 md:grid-cols-[128px_minmax(0,1fr)_auto] md:gap-x-8 md:border-t md:border-b-0 md:py-8"
    :class="props.busy === 'remove' ? 'opacity-50' : ''"
  >
    <div
      class="row-span-2 flex aspect-[4/5] items-center justify-center self-start overflow-hidden bg-backdrop-sand"
    >
      <img
        v-if="props.item.thumbnail"
        :src="props.item.thumbnail"
        :alt="product"
        class="size-full object-cover"
      />
      <ImageOff v-else class="size-6 text-icon-subtle" aria-hidden="true" />
    </div>

    <h2 class="col-start-2 min-w-0 text-body-sm font-normal md:text-body">{{ product }}</h2>
    <p
      data-testid="line-total"
      class="col-start-3 text-right text-price"
      :class="props.busy === 'update' ? 'text-muted-foreground' : ''"
    >
      {{ formatPrice(props.item.unit_price * props.item.quantity) }}
    </p>

    <div class="col-span-2 col-start-2 flex min-w-0 flex-col gap-1 md:col-span-1 md:gap-1.5">
      <p class="text-caption text-muted-foreground">{{ props.item.variant_title }}</p>
      <p class="hidden flex-wrap items-baseline gap-x-2 md:flex">
        <span class="text-price" :class="oldPrice !== null ? 'text-sale' : ''">
          {{ formatPrice(props.item.unit_price) }}
        </span>
        <template v-if="oldPrice !== null">
          <span class="sr-only">{{ $t("products.originalPrice") }}</span>
          <s class="text-price text-muted-foreground">{{ formatPrice(oldPrice) }}</s>
        </template>
      </p>
      <p v-if="limited" class="flex items-center gap-2 text-caption text-warning">
        <span class="hidden size-1.5 rounded-full bg-warning md:block" aria-hidden="true" />
        {{ $t("products.badges.limited") }}
      </p>

      <div
        class="mt-auto flex flex-wrap items-center justify-between gap-x-6 pt-3 md:justify-start md:pt-4"
      >
        <div class="flex items-center gap-3">
          <div role="group" :aria-label="$t('cart.quantityOf', { product })">
            <QuantityStepper
              v-model="quantity"
              :min="0"
              :max="max"
              :disabled="props.disabled"
              size="sm"
            />
          </div>
          <span v-if="props.busy === 'update'" role="status" class="inline-flex">
            <Spinner class="text-muted-foreground" />
            <span class="sr-only">{{ $t("cart.updating") }}</span>
          </span>
        </div>
        <div class="flex items-center gap-4 whitespace-nowrap md:gap-6">
          <button
            type="button"
            :class="textButton"
            :disabled="props.disabled"
            :aria-label="$t('cart.moveItem', { product })"
            @click="emit('move')"
          >
            {{ $t("cart.moveToWishlist") }}
          </button>
          <button
            v-if="props.busy === 'remove'"
            type="button"
            :class="textButton"
            disabled
            :aria-label="$t('cart.removingItem', { product })"
          >
            <Spinner />
            {{ $t("cart.removing") }}
          </button>
          <button
            v-else
            type="button"
            :class="textButton"
            :disabled="props.disabled"
            :aria-label="$t('cart.removeItem', { product })"
            @click="emit('remove')"
          >
            {{ $t("cart.remove") }}
          </button>
        </div>
      </div>
      <p v-if="atLimit" role="status" class="mt-1 text-body-sm text-destructive">
        {{ $t("products.onlyLeft", { count: limit }) }}
      </p>
    </div>
  </div>
</template>
