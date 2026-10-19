<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { toast } from "vue-sonner"
import { colourHex } from "~/utils/colourDots"
import { findColourOption, isSizeOption } from "~/utils/optionNames"
import { isLimitedStock, priceView } from "~/utils/productBadges"
import { optionValueStock, stockLimit } from "~/utils/variantSelection"

const props = defineProps<{ product: HttpTypes.StoreProduct; startVariantId?: string | null }>()
const emit = defineEmits<{
  "colour-change": [value: string]
  "variant-change": [variantId: string]
}>()

const cart = useCart()
const { settings } = useStorefront()
const { t } = useI18n()
const localePath = useLocalePath()

// The selected value for each option ID. The start value is the options of the variant with
// startVariantId, else of the first variant. The setup fills it, not onMounted, so that the
// server render has the price of that variant.
const startVariant =
  props.product.variants?.find((item) => item.id === props.startVariantId) ??
  props.product.variants?.[0]
const selected = ref<Record<string, string>>(
  Object.fromEntries(
    (startVariant?.options ?? [])
      .filter((item) => !!item.option_id)
      .map((item) => [item.option_id as string, item.value])
  )
)
const busy = ref(false)
// Phones have no stepper, so they always add 1.
const quantity = ref(1)
const stockError = ref<string | null>(null)

const variant = computed(() => findVariant(props.product, selected.value))
const canBuy = computed(() => variant.value !== null && isPurchasable(variant.value))
const price = computed(() =>
  priceView(variant.value ? [variant.value] : (props.product.variants ?? []))
)
const limited = computed(
  () =>
    variant.value !== null && isLimitedStock([variant.value], settings.value.low_stock_threshold)
)

const colourOption = computed(() => findColourOption(props.product))
const swatches = computed(() =>
  (colourOption.value?.values ?? []).map(({ value }) => ({
    value,
    hex: colourHex(value, props.product, settings.value.colours),
  }))
)
const otherOptions = computed(() =>
  (props.product.options ?? []).filter((option) => option.id !== colourOption.value?.id)
)

// A new quantity or a new variant makes the stock message out of date. The watcher is sync, so
// it cannot clear a message that a click sets in the same tick.
watch(
  [quantity, () => variant.value?.id],
  () => {
    stockError.value = null
  },
  { flush: "sync" }
)

// The page owns the URL, so the component only reports a new variant. The watcher is not
// immediate, so the start selection emits nothing. A selection that matches no variant emits
// nothing.
watch(
  () => variant.value?.id,
  (id) => {
    if (id) {
      emit("variant-change", id)
    }
  }
)

function select(optionId: string, value: string): void {
  selected.value = { ...selected.value, [optionId]: value }
}

function selectColour(optionId: string, value: string): void {
  select(optionId, value)
  emit("colour-change", value)
}

async function addToCart(): Promise<void> {
  const current = variant.value
  if (!current || !canBuy.value) {
    return
  }
  const limit = stockLimit(current)
  if (limit !== null && quantity.value > limit) {
    stockError.value = t("products.onlyLeft", { count: limit })
    return
  }
  busy.value = true
  try {
    await cart.add(current.id, quantity.value)
    toast.success(t("products.added"), {
      action: { label: t("products.viewCart"), onClick: () => navigateTo(localePath("/cart")) },
    })
  } catch {
    toast.error(t("products.addFailed"))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-6">
      <p v-if="price.original !== null" class="flex flex-wrap items-baseline gap-x-3">
        <span class="text-price-lg text-sale">{{ formatPrice(price.amount) }}</span>
        <s class="text-price-lg text-muted-foreground">
          <span class="sr-only">{{ $t("products.originalPrice") }}</span>
          {{ formatPrice(price.original) }}
        </s>
        <span class="text-price-lg text-sale">
          {{ $t("products.discount", { percent: price.percent }) }}
        </span>
      </p>
      <p v-else class="text-price-lg">{{ formatPrice(price.amount) }}</p>

      <slot />
    </div>

    <ColourSwatches
      v-if="colourOption"
      :model-value="selected[colourOption.id] ?? null"
      :values="swatches"
      :label="$t('product.colour')"
      @update:model-value="(value) => selectColour(colourOption!.id, value)"
    />

    <div v-for="option in otherOptions" :key="option.id" class="flex flex-col gap-3">
      <p class="text-field-label">
        {{ isSizeOption(option.title) ? $t("product.size") : option.title }}
        <span v-if="selected[option.id]" class="ml-1 text-muted-foreground">{{
          selected[option.id]
        }}</span>
      </p>
      <SizeCells
        :model-value="selected[option.id] ?? null"
        :sizes="optionValueStock(product, selected, option.id)"
        :label="isSizeOption(option.title) ? $t('product.size') : option.title"
        :sold-out-label="$t('products.badges.soldOut')"
        @update:model-value="(value) => select(option.id, value)"
      />
    </div>

    <p
      v-if="limited"
      data-testid="limited-stock"
      class="flex items-center gap-2 text-body-sm text-warning before:size-1.5 before:rounded-full before:bg-warning"
    >
      {{ $t("products.badges.limited") }}
    </p>

    <div class="flex flex-col gap-3">
      <p v-if="stockError" role="alert" class="text-body-sm text-destructive">{{ stockError }}</p>
      <div data-testid="buy-row" class="flex items-stretch gap-2">
        <QuantityStepper v-model="quantity" :min="1" class="hidden lg:inline-flex" />
        <Button
          data-testid="add-to-cart"
          size="lg"
          class="h-14 min-w-0 flex-1"
          :disabled="!canBuy || busy"
          @click="addToCart"
        >
          <Spinner v-if="busy" />
          <template v-if="variant === null">{{ $t("products.selectVariant") }}</template>
          <template v-else-if="!canBuy">{{ $t("products.outOfStock") }}</template>
          <template v-else>{{ $t("products.addToCart") }}</template>
        </Button>
        <WishlistButton look="square" :variant-id="variant?.id ?? null" />
      </div>
    </div>
  </div>
</template>
