<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { AlertVariants } from '.'
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import { alertVariants } from '.'

const props = defineProps<{
  class?: HTMLAttributes['class']
  variant?: AlertVariants['variant']
}>()

// Only an error interrupts the screen reader. The other variants are polite status messages.
const role = computed(() => (props.variant === 'destructive' ? 'alert' : 'status'))
</script>

<template>
  <div
    data-slot="alert"
    :class="cn(alertVariants({ variant }), props.class)"
    :role="role"
  >
    <slot />
  </div>
</template>
