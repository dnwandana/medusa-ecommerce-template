import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

// The copy is sentence case. The classes make the capitals.
export const badgeVariants = cva(
  'inline-flex h-[22px] items-center rounded-none px-2 text-[10px] leading-none font-medium uppercase tracking-[0.14em]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-foreground',
        outline: 'border border-foreground bg-transparent text-foreground',
        sale: 'bg-sale-soft text-sale',
        new: 'bg-background text-foreground',
        low: 'bg-warning-soft text-warning',
        out: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
