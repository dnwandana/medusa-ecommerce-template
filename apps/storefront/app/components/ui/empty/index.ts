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
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type EmptyVariants = VariantProps<typeof emptyVariants>

// The shape "circle" is a hairline on the page colour, and its tone sets only the icon colour.
// The shape "disc" is filled with the soft colour of its tone. The tone gives the state of the
// page: neutral, success, warning, or error.
export const emptyMediaVariants = cva(
  'flex size-16 shrink-0 items-center justify-center rounded-full [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      shape: {
        circle: 'border border-border bg-transparent',
        disc: '',
      },
      tone: {
        muted: 'text-foreground',
        success: 'text-success',
        warning: 'text-warning',
        destructive: 'text-destructive',
      },
    },
    compoundVariants: [
      { shape: 'disc', tone: 'muted', class: 'bg-muted' },
      { shape: 'disc', tone: 'success', class: 'bg-success-soft' },
      { shape: 'disc', tone: 'warning', class: 'bg-warning-soft' },
      { shape: 'disc', tone: 'destructive', class: 'bg-destructive-soft' },
    ],
    defaultVariants: {
      shape: 'circle',
      tone: 'muted',
    },
  },
)

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>
