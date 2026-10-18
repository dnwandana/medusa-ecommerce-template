<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { DialogClose } from 'reka-ui'
import { Button } from '@/components/ui/button'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes['class']
  showCloseButton?: boolean
}>(), {
  showCloseButton: false,
})
</script>

<template>
  <!-- The negative margins match the padding of DialogContent. Below md the buttons share the
       width and a hairline separates the footer. From md the buttons sit at the right. -->
  <div
    data-slot="dialog-footer"
    :class="cn('-mx-6 -mb-6 flex flex-row gap-3 border-t border-border p-4 *:flex-1 md:mx-0 md:mb-0 md:justify-end md:border-t-0 md:p-0 md:*:flex-none', props.class)"
  >
    <slot />
    <DialogClose v-if="showCloseButton" as-child>
      <Button variant="outline">
        Close
      </Button>
    </DialogClose>
  </div>
</template>
