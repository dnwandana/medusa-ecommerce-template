<script lang="ts" setup>
import type { StepperSeparatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { StepperSeparator, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<StepperSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <StepperSeparator
    v-bind="forwarded"
    data-slot="stepper-separator"
    :class="cn(
      'h-0.5 min-w-4 flex-1 rounded-sm bg-border',
      'group-data-[disabled]:opacity-50',
      'group-data-[state=completed]:bg-primary',
      props.class,
    )"
  />
</template>
