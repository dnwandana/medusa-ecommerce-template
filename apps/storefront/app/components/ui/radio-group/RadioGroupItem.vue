<script setup lang="ts">
import type { RadioGroupItemProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  RadioGroupIndicator,
  RadioGroupItem,
  useForwardProps,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<RadioGroupItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RadioGroupItem
    data-slot="radio-group-item"
    v-bind="forwardedProps"
    :class="
      cn(
        'group/radio-group-item peer relative flex size-5 shrink-0 aspect-square items-center justify-center rounded-full border border-input bg-card outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:shadow-focus data-[state=checked]:border-primary aria-invalid:border-destructive disabled:cursor-not-allowed disabled:bg-disabled disabled:border-border',
        props.class,
      )
    "
  >
    <RadioGroupIndicator
      data-slot="radio-group-indicator"
      class="flex items-center justify-center"
    >
      <slot>
        <span class="size-2.5 rounded-full bg-primary" />
      </slot>
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
