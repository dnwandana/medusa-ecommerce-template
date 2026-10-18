<script setup lang="ts">
import type { CheckboxRootEmits, CheckboxRootProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { CheckIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { cn } from '@/lib/utils'
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<CheckboxRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<CheckboxRootEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CheckboxRoot
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :class="cn('peer relative flex size-[18px] shrink-0 items-center justify-center rounded-none border border-foreground bg-transparent outline-none transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary focus-visible:shadow-[var(--focus-ring)] aria-invalid:border-destructive disabled:cursor-not-allowed disabled:border-disabled-foreground disabled:data-[state=checked]:bg-disabled-foreground group-has-disabled/field:opacity-50', props.class)"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="[&>svg]:size-3 grid place-content-center text-current transition-none"
    >
      <slot v-bind="slotProps">
        <CheckIcon :stroke-width="1.5" />
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
