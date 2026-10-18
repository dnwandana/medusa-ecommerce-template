<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { Toaster as Sonner } from 'vue-sonner'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
// vue-sonner 2 does not inject its styles. Without them, the toasts have no position or layout.
import 'vue-sonner/style.css'

const props = defineProps<ToasterProps>()
const delegatedProps = reactiveOmit(props, 'class', 'toastOptions')

// A toast is a card with a hairline. Its action is the small outline button.
const defaultToastOptions: ToasterProps['toastOptions'] = {
  classes: {
    toast: 'bg-card border border-border shadow-lg rounded-none text-foreground text-body-sm',
    title: 'text-body font-medium',
    actionButton: buttonVariants({ variant: 'outline', size: 'sm' }),
  },
}
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--card)',
      '--normal-text': 'var(--foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius-lg)',
      '--gray2': 'var(--accent)',
      '--gray3': 'var(--border)',
      '--gray4': 'var(--border)',
      '--gray5': 'var(--border)',
      '--gray12': 'var(--popover-foreground)',
    }"
    :toast-options="props.toastOptions ?? defaultToastOptions"
    v-bind="delegatedProps"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin motion-reduce:[animation-duration:3s]" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>

<style>
/* The vue-sonner styles are not in a cascade layer, so they win over the Tailwind classes of
   toastOptions. revert-layer gives these properties back to the classes. */
[data-sonner-toaster] [data-sonner-toast][data-styled='true'] {
  background: revert-layer;
  border: revert-layer;
  border-radius: revert-layer;
  box-shadow: revert-layer;
  color: revert-layer;
  font-size: revert-layer;
}

[data-sonner-toaster] [data-sonner-toast][data-styled='true'] [data-title] {
  line-height: revert-layer;
}

[data-sonner-toaster] [data-sonner-toast][data-styled='true'] [data-button] {
  height: revert-layer;
  padding-left: revert-layer;
  padding-right: revert-layer;
  border: revert-layer;
  border-radius: revert-layer;
  background: revert-layer;
  color: revert-layer;
  font-size: revert-layer;
  font-weight: revert-layer;
  box-shadow: revert-layer;
}
</style>
