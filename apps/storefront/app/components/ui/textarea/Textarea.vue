<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  defaultValue?: string | number
  modelValue?: string | number
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
  <textarea
    v-model="modelValue"
    data-slot="textarea"
    :class="cn('min-h-28 px-3 py-2.5 resize-y w-full min-w-0 rounded-md border border-input bg-card text-base text-foreground placeholder:text-muted-foreground outline-none focus-visible:shadow-focus aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_var(--destructive)] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground', props.class)"
  />
</template>
