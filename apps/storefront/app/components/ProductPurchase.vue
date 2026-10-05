<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

const props = defineProps<{ product: HttpTypes.StoreProduct }>()

const cart = useCart()

// The selected value for each option ID. The start value is the options of the first variant.
// The setup fills it, not onMounted, so that the server render has the price.
const selected = ref<Record<string, string>>(
  Object.fromEntries(
    (props.product.variants?.[0]?.options ?? [])
      .filter((item) => !!item.option_id)
      .map((item) => [item.option_id as string, item.value])
  )
)
const message = ref<string | null>(null)
const busy = ref(false)

const variant = computed(() => findVariant(props.product, selected.value))
const canBuy = computed(() => variant.value !== null && isPurchasable(variant.value))

function select(optionId: string, value: string): void {
  selected.value = { ...selected.value, [optionId]: value }
  message.value = null
}

async function addToCart(): Promise<void> {
  const current = variant.value
  if (!current || !canBuy.value) {
    return
  }
  busy.value = true
  message.value = null
  try {
    await cart.add(current.id, 1)
    message.value = "products.added"
  } catch {
    message.value = "products.addFailed"
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-for="option in product.options ?? []" :key="option.id" class="flex flex-col gap-2">
      <span class="text-sm font-medium">{{ option.title }}</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="item in option.values ?? []"
          :key="item.value"
          type="button"
          class="rounded border px-3 py-1 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          :aria-pressed="selected[option.id] === item.value ? 'true' : 'false'"
          @click="select(option.id, item.value)"
        >{{ item.value }}</button>
      </div>
    </div>

    <p class="text-xl font-semibold">{{ formatPrice(variantPrice(variant)) }}</p>

    <Button data-testid="add-to-cart" :disabled="!canBuy || busy" @click="addToCart">
      <template v-if="variant === null">{{ $t("products.selectVariant") }}</template>
      <template v-else-if="!canBuy">{{ $t("products.outOfStock") }}</template>
      <template v-else>{{ $t("products.addToCart") }}</template>
    </Button>

    <p v-if="message" role="status" class="text-sm text-neutral-600">{{ $t(message) }}</p>

    <WishlistButton :variant-id="variant?.id ?? null" />
  </div>
</template>
