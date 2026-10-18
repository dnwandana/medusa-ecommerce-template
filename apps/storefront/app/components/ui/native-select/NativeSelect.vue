<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ChevronDown } from '@lucide/vue'
import { useAttrs } from 'vue'
import { cn } from '@/lib/utils'

// The id, the name and the aria attributes must reach the select, not the wrapper.
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  placeholder?: string
  class?: HTMLAttributes['class']
}>()

const modelValue = defineModel<string>()
const attrs = useAttrs()
</script>

<template>
  <div data-slot="native-select" class="relative w-full">
    <select
      v-bind="attrs"
      v-model="modelValue"
      :class="cn(
        'h-12 w-full min-w-0 appearance-none rounded-none border-0 border-b border-input bg-transparent px-0 pr-8 text-body text-foreground focus-visible:border-foreground focus-visible:outline-none aria-invalid:border-destructive disabled:cursor-not-allowed disabled:border-dashed disabled:text-disabled-foreground',
        props.class,
      )"
    >
      <option v-if="placeholder" value="" disabled>
        {{ placeholder }}
      </option>
      <slot />
    </select>
    <ChevronDown
      :size="16"
      :stroke-width="1.5"
      aria-hidden="true"
      class="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-foreground"
    />
  </div>
</template>
