<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes['class']
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', payload: string | number): void
}>()

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="cn(
      'h-11 px-3 w-full min-w-0 rounded-md border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none focus-visible:shadow-focus aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_var(--destructive)] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground',
      props.class,
    )"
  >
</template>
