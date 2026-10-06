<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { EmptyVariants } from '.'
import { cn } from '@/lib/utils'
import { emptyVariants } from '.'

const props = defineProps<{
  class?: HTMLAttributes['class']
  variant?: EmptyVariants['variant']
}>()
</script>

<template>
  <div
    data-slot="empty"
    :data-variant="variant ?? 'default'"
    :class="cn(emptyVariants({ variant }), props.class)"
  >
    <slot />
  </div>
</template>
