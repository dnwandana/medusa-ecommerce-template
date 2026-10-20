<script setup lang="ts">
import type { AcceptableValue } from "reka-ui"
import { ToggleGroupItem, ToggleGroupRoot } from "reka-ui"

defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  label: string
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

// A second click on the selected segment gives an empty value. The control always keeps one value.
function select(value: AcceptableValue | AcceptableValue[] | undefined): void {
  if (typeof value === "string" && value !== "") emit("update:modelValue", value)
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="modelValue"
    :aria-label="label"
    class="flex w-full border border-foreground"
    @update:model-value="select"
  >
    <ToggleGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      class="min-h-11 flex-1 border-l border-foreground px-4 text-nav text-foreground uppercase outline-none first:border-l-0 focus-visible:shadow-[var(--focus-ring)] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
    >
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
