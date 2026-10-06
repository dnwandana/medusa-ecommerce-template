<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { LoaderCircle } from '@lucide/vue'
import { cn } from '@/lib/utils'

// The Spinner is decorative. The text next to it gives the meaning to a screen reader.
const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <LoaderCircle aria-hidden="true" :class="cn('size-4 animate-spin motion-reduce:[animation-duration:3s]', props.class)" />
</template>
