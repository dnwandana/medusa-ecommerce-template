<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { toast } from "vue-sonner"

const props = defineProps<{ product: HttpTypes.StoreProduct }>()

const cart = useCart()
const { t } = useI18n()
const localePath = useLocalePath()

// The selected value for each option ID. The start value is the options of the first variant.
// The setup fills it, not onMounted, so that the server render has the price.
const selected = ref<Record<string, string>>(
  Object.fromEntries(
    (props.product.variants?.[0]?.options ?? [])
      .filter((item) => !!item.option_id)
      .map((item) => [item.option_id as string, item.value])
  )
)
const busy = ref(false)

const variant = computed(() => findVariant(props.product, selected.value))
const canBuy = computed(() => variant.value !== null && isPurchasable(variant.value))

function select(optionId: string, value: string): void {
  selected.value = { ...selected.value, [optionId]: value }
}

// reka-ui single mode clears the value when the user clicks the selected item. Keep the selection.
function choose(optionId: string, value: unknown): void {
  if (typeof value === "string" && value !== "") {
    select(optionId, value)
  }
}

async function addToCart(): Promise<void> {
  const current = variant.value
  if (!current || !canBuy.value) {
    return
  }
  busy.value = true
  try {
    await cart.add(current.id, 1)
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
  <div class="flex flex-col gap-6">
    <p class="text-price-lg">{{ formatPrice(variantPrice(variant)) }}</p>

    <slot />

    <div v-for="option in product.options ?? []" :key="option.id" class="flex flex-col gap-2">
      <span :id="`option-${option.id}`" class="text-body-sm font-semibold">{{ option.title }}</span>
      <!-- The empty string keeps the ToggleGroup controlled when no value is selected.
           An uncontrolled ToggleGroup keeps its own value, and a click on the selected item clears it. -->
      <ToggleGroup
        type="single"
        :aria-labelledby="`option-${option.id}`"
        :model-value="selected[option.id] ?? ''"
        @update:model-value="(value) => choose(option.id, value)"
      >
        <ToggleGroupItem v-for="item in option.values ?? []" :key="item.value" :value="item.value">
          {{ item.value }}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>

    <div class="flex flex-col gap-3">
      <Button
        data-testid="add-to-cart"
        size="lg"
        class="w-full"
        :disabled="!canBuy || busy"
        @click="addToCart"
      >
        <Spinner v-if="busy" />
        <template v-if="variant === null">{{ $t("products.selectVariant") }}</template>
        <template v-else-if="!canBuy">{{ $t("products.outOfStock") }}</template>
        <template v-else>{{ $t("products.addToCart") }}</template>
      </Button>

      <WishlistButton :variant-id="variant?.id ?? null" />
    </div>
  </div>
</template>
