import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-semibold text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground disabled:border-transparent aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary data-[state=on]:bg-primary-soft data-[state=on]:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'bg-card border-input text-foreground hover:bg-accent disabled:bg-card disabled:border-border',
        ghost: 'text-foreground hover:bg-accent disabled:bg-transparent',
        link: 'h-auto! p-0! border-0 text-link underline underline-offset-4',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        'sm': 'h-9 px-3',
        'default': 'h-11 px-[18px]',
        'lg': 'h-13 px-6 text-base',
        'icon': 'size-11 p-0',
        'icon-sm': 'size-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
