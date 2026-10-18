<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { EmptyMediaVariants } from '.'
import { cn } from '@/lib/utils'
import { emptyMediaVariants } from '.'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  shape?: EmptyMediaVariants['shape']
  tone?: EmptyMediaVariants['tone']
}>(), {
  shape: 'circle',
  tone: 'muted',
})
</script>

<template>
  <div
    data-slot="empty-media"
    :data-shape="shape"
    :data-tone="tone"
    :class="cn(emptyMediaVariants({ shape, tone }), props.class)"
  >
    <slot />
  </div>
</template>
