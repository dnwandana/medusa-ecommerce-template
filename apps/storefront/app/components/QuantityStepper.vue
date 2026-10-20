<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue"

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number | null
    disabled?: boolean
    size?: "default" | "sm"
  }>(),
  { min: 1, max: null, disabled: false, size: "default" }
)

// The parent owns the value. Each click emits a step from the current prop value.
const emit = defineEmits<{ "update:modelValue": [value: number] }>()
const quantity = computed(() => props.modelValue)

const canDecrease = computed(() => !props.disabled && quantity.value > props.min)
const canIncrease = computed(
  () => !props.disabled && (props.max === null || quantity.value < props.max)
)

function step(delta: number): void {
  const next = quantity.value + delta
  if (next < props.min || (props.max !== null && next > props.max)) return
  emit("update:modelValue", next)
}

// The small control is 40 px high. The pseudo element keeps the target of each button at 44 px.
const buttonClass = computed(() => [
  "relative inline-flex w-11 shrink-0 items-center justify-center text-foreground outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:text-disabled-foreground",
  props.size === "sm" ? "h-[38px] after:absolute after:inset-x-0 after:-inset-y-[3px]" : "h-11",
])
</script>

<template>
  <div
    role="group"
    :aria-label="$t('common.quantity')"
    class="inline-flex items-center border border-border"
  >
    <button
      type="button"
      :class="buttonClass"
      :disabled="!canDecrease"
      :aria-label="$t('common.decrease')"
      @click="step(-1)"
    >
      <Minus :size="16" :stroke-width="1.5" aria-hidden="true" />
    </button>
    <span aria-live="polite" class="w-10 text-center text-price text-foreground tabular-nums">{{
      quantity
    }}</span>
    <button
      type="button"
      :class="buttonClass"
      :disabled="!canIncrease"
      :aria-label="$t('common.increase')"
      @click="step(1)"
    >
      <Plus :size="16" :stroke-width="1.5" aria-hidden="true" />
    </button>
  </div>
</template>
