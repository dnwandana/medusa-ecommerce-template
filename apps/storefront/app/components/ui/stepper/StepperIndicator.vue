<script lang="ts" setup>
import type { StepperIndicatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { StepperIndicator, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<StepperIndicatorProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <StepperIndicator
    v-slot="slotProps"
    v-bind="forwarded"
    data-slot="stepper-indicator"
    :class="cn(
      'flex size-9 shrink-0 items-center justify-center rounded-full border border-input bg-card text-muted-foreground',
      'group-data-[disabled]:opacity-50',
      'group-data-[state=completed]:bg-primary group-data-[state=completed]:border-primary group-data-[state=completed]:text-primary-foreground',
      'group-data-[state=active]:border-2 group-data-[state=active]:border-primary group-data-[state=active]:bg-primary-soft group-data-[state=active]:text-primary',
      props.class,
    )"
  >
    <slot v-bind="slotProps" />
  </StepperIndicator>
</template>
