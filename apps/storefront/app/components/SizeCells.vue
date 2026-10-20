<script setup lang="ts">
import type { AcceptableValue } from "reka-ui"
import { RadioGroupItem, RadioGroupRoot } from "reka-ui"

defineProps<{
  modelValue: string | null
  sizes: { value: string; soldOut: boolean }[]
  label: string
  soldOutLabel: string
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

function select(value: AcceptableValue): void {
  if (typeof value === "string") emit("update:modelValue", value)
}
</script>

<template>
  <RadioGroupRoot
    :model-value="modelValue"
    :aria-label="label"
    class="grid grid-cols-5 gap-2"
    @update:model-value="select"
  >
    <!-- A sold-out size is disabled, so the arrow keys skip it. The name says why. -->
    <RadioGroupItem
      v-for="size in sizes"
      :key="size.value"
      :value="size.value"
      :disabled="size.soldOut"
      :aria-disabled="size.soldOut ? 'true' : undefined"
      :aria-label="size.soldOut ? `${size.value}, ${soldOutLabel}` : undefined"
      class="relative flex h-12 items-center justify-center border border-border text-body text-foreground outline-none focus-visible:shadow-[var(--focus-ring)] data-[disabled]:cursor-not-allowed data-[disabled]:text-muted-foreground data-[state=checked]:border-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
    >
      {{ size.value }}
      <span
        v-if="size.soldOut"
        data-slot="strike"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--border)_calc(50%-0.5px),var(--border)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"
      />
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
