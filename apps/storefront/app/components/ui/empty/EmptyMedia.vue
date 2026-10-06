<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { EmptyMediaVariants } from '.'
import { cn } from '@/lib/utils'
import { emptyMediaVariants } from '.'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  tone?: EmptyMediaVariants['tone']
}>(), {
  tone: 'muted',
})
</script>

<template>
  <div
    data-slot="empty-media"
    :data-tone="tone"
    :class="cn(emptyMediaVariants({ tone }), props.class)"
  >
    <slot />
  </div>
</template>
