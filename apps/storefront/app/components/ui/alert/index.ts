import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Alert } from './Alert.vue'
export { default as AlertAction } from './AlertAction.vue'
export { default as AlertDescription } from './AlertDescription.vue'
export { default as AlertTitle } from './AlertTitle.vue'

// The second column exists only with an icon, so an Alert with text only uses the full width.
// Each variant is a soft tint with no border.
export const alertVariants = cva('group/alert relative grid w-full items-start gap-1 rounded-none border-0 px-4 py-3 text-left text-body-sm has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*=size-])]:size-4', {
  variants: {
    variant: {
      default: 'bg-secondary text-foreground',
      destructive: 'bg-destructive-soft text-destructive *:data-[slot=alert-description]:text-destructive',
      success: 'bg-success-soft text-success *:data-[slot=alert-description]:text-success',
      warning: 'bg-warning-soft text-warning *:data-[slot=alert-description]:text-warning',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type AlertVariants = VariantProps<typeof alertVariants>
