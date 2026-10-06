<script setup lang="ts">
import type { PaginationEllipsisProps } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { MoreHorizontalIcon } from '@lucide/vue'
import { reactiveOmit } from '@vueuse/core'
import { PaginationEllipsis } from 'reka-ui'
import { cn } from '@/lib/utils'

// The app passes the label from i18n. The default is for a use with no i18n.
const props = withDefaults(
  defineProps<PaginationEllipsisProps & { class?: HTMLAttributes['class'], label?: string }>(),
  { label: 'More pages' },
)

const delegatedProps = reactiveOmit(props, 'class', 'label')
</script>

<template>
  <PaginationEllipsis
    data-slot="pagination-ellipsis"
    v-bind="delegatedProps"
    :class="cn('size-8 [&_svg:not([class*=size-])]:size-4 flex items-center justify-center', props.class)"
  >
    <slot>
      <MoreHorizontalIcon />
      <span class="sr-only">{{ label }}</span>
    </slot>
  </PaginationEllipsis>
</template>
