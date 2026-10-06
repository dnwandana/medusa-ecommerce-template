<script lang="ts" setup>
import type { StepperTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { StepperTitle, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<StepperTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <StepperTitle data-slot="stepper-title" v-bind="forwarded" :class="cn('text-body-sm font-semibold whitespace-nowrap text-muted-foreground group-data-[state=active]:text-primary group-data-[state=completed]:text-foreground', props.class)">
    <slot />
  </StepperTitle>
</template>
