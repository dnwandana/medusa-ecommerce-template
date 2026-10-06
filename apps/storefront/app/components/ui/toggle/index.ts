import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Toggle } from './Toggle.vue'

export const toggleVariants = cva(
  'group/toggle inline-flex min-w-14 h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-card px-3.5 text-body-sm font-semibold text-foreground outline-none transition-colors not-data-[state=on]:hover:bg-accent focus-visible:shadow-focus data-[state=on]:border-primary data-[state=on]:bg-primary-soft data-[state=on]:text-primary data-[state=on]:shadow-[inset_0_0_0_1px_var(--primary)] aria-invalid:border-destructive disabled:pointer-events-none disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground [&_svg:not([class*=size-])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: '',
        outline: '',
      },
      size: {
        default: '',
        sm: 'h-9 min-w-9 px-2.5',
        lg: 'h-12 min-w-16 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ToggleVariants = VariantProps<typeof toggleVariants>
