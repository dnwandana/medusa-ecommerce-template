<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { computed, useAttrs, useId } from 'vue'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})

const attrs = useAttrs()
const labelId = useId()

// A screen reader skips the hidden label. Thus the button points to the label for its name,
// unless the caller gives the name.
const labelledBy = computed(() =>
  props.loading && !attrs['aria-label'] && !attrs['aria-labelledby'] ? labelId : undefined,
)
</script>

<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :disabled="disabled || loading || undefined"
    :aria-busy="loading || undefined"
    :aria-labelledby="labelledBy"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <!-- The hidden label keeps the width of the button. With as-child, the slot must stay the only child. -->
    <template v-if="loading && !asChild">
      <span :id="labelId" data-slot="button-label" class="invisible inline-flex items-center gap-2">
        <slot />
      </span>
      <span class="absolute inset-0 flex items-center justify-center">
        <Spinner data-slot="spinner" class="size-[18px]" />
      </span>
    </template>
    <slot v-else />
  </Primitive>
</template>
