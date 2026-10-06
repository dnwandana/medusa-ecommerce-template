import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-primary-foreground text-caption font-semibold tabular-nums',
  {
    variants: {
      variant: {
        default: '',
        dot: 'absolute top-[3px] right-px h-[18px] min-w-[18px] px-[5px] text-[11px] border-2 border-background box-content',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
