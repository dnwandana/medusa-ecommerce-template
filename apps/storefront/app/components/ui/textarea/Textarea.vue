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
    :class="cn('min-h-24 py-3 resize-y w-full min-w-0 rounded-none border-0 border-b border-input bg-transparent px-0 text-body text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:outline-none aria-invalid:border-destructive disabled:cursor-not-allowed disabled:border-dashed disabled:text-disabled-foreground', props.class)"
  />
</template>
