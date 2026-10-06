import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertAction } from './AlertAction.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

// The second column exists only with an icon, so an Alert with text only uses the full width.
export const alertVariants = cva('grid gap-y-0.5 items-start rounded-lg border px-4 py-3.5 text-left text-body-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*=size-])]:size-4 group/alert relative w-full', {
  variants: {
    variant: {
      default: 'bg-card border-border text-foreground',
      destructive: 'bg-destructive-soft border-[#efc4be] text-destructive *:data-[slot=alert-description]:text-destructive',
      success: 'bg-success-soft border-[#bfdcc6] text-success *:data-[slot=alert-description]:text-success',
      info: 'bg-primary-soft border-[#c8d4e4] text-primary *:data-[slot=alert-description]:text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type AlertVariants = VariantProps<typeof alertVariants>
