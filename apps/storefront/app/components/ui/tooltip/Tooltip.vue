<script setup lang="ts">
import type { TooltipRootEmits, TooltipRootProps } from 'reka-ui'
import { TooltipProvider, TooltipRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<TooltipRootProps>()
const emits = defineEmits<TooltipRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)

// Each tooltip has its own provider, so a page or a test needs no provider at the app root.
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <TooltipRoot
      v-slot="slotProps"
      data-slot="tooltip"
      v-bind="forwarded"
    >
      <slot v-bind="slotProps" />
    </TooltipRoot>
  </TooltipProvider>
</template>
