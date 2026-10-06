import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Empty } from './Empty.vue'
export { default as EmptyContent } from './EmptyContent.vue'
export { default as EmptyDescription } from './EmptyDescription.vue'
export { default as EmptyHeader } from './EmptyHeader.vue'
export { default as EmptyMedia } from './EmptyMedia.vue'
export { default as EmptyTitle } from './EmptyTitle.vue'

export const emptyVariants = cva(
  'flex w-full min-w-0 flex-col items-center gap-4 px-6 py-14 text-center text-balance *:max-w-[460px]',
  {
    variants: {
      variant: {
        default: '',
        outline: 'border border-dashed border-[#d6cec2] rounded-xl bg-card',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type EmptyVariants = VariantProps<typeof emptyVariants>

// The tone gives the state of the page: neutral, success, warning, or error.
export const emptyMediaVariants = cva(
  'flex size-14 shrink-0 items-center justify-center rounded-full [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        muted: 'bg-muted text-foreground',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        destructive: 'bg-destructive-soft text-destructive',
      },
    },
    defaultVariants: {
      tone: 'muted',
    },
  },
)

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>
