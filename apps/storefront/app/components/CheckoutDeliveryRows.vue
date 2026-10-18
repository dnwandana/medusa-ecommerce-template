<script setup lang="ts">
import type { ShippingChoice } from "~/composables/useCheckout"

const props = defineProps<{
  options: ShippingChoice[]
  selectedId: string | null
  loading?: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ select: [id: string] }>()

const { t } = useI18n()

function aside(option: ShippingChoice): string | undefined {
  return option.amount === null ? undefined : formatDeliveryPrice(option.amount, t("common.free"))
}

function onSelect(value: unknown): void {
  if (typeof value === "string") {
    emit("select", value)
  }
}
</script>

<template>
  <div v-if="props.loading" role="status">
    <span class="sr-only">{{ $t("checkout.loadingShipping") }}</span>
    <div
      v-for="width in ['w-2/5', 'w-1/3']"
      :key="width"
      data-slot="skeleton-row"
      aria-hidden="true"
      class="flex h-16 items-center gap-4 border-b border-border"
    >
      <Skeleton class="size-[18px] shrink-0 rounded-full" />
      <Skeleton class="h-4" :class="width" />
      <Skeleton class="ml-auto h-4 w-16" />
    </div>
  </div>

  <!-- The page selects the only option itself, so this row emits nothing. -->
  <RadioRow
    v-else-if="props.options.length === 1"
    single
    :value="props.options[0]!.id"
    :title="props.options[0]!.name"
    :aside="aside(props.options[0]!)"
  />

  <RadioGroup
    v-else-if="props.options.length > 1"
    :model-value="props.selectedId ?? undefined"
    name="shipping_option"
    class="gap-0"
    :disabled="props.disabled"
    @update:model-value="onSelect"
  >
    <RadioRow
      v-for="option in props.options"
      :key="option.id"
      :value="option.id"
      :title="option.name"
      :aside="aside(option)"
    />
  </RadioGroup>
</template>
