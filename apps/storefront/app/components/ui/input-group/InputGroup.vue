<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="input-group"
    role="group"
    :class="cn(
      'group/input-group relative flex h-11 w-full min-w-0 items-center overflow-hidden rounded-md border border-input bg-card transition-colors outline-none has-[:focus-visible]:shadow-focus has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:shadow-[0_0_0_1px_var(--destructive)] has-disabled:border-border has-disabled:bg-disabled has-[>textarea]:h-auto has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
