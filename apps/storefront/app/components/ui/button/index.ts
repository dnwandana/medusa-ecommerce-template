import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

// A loading button is disabled, but it keeps the colours of its variant. The aria-busy:disabled:
// classes have a higher specificity than the disabled: classes.
export const buttonVariants = cva(
  'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-none text-button uppercase whitespace-nowrap transition-colors duration-250 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground aria-busy:cursor-progress aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary data-[state=on]:bg-primary-soft data-[state=on]:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        'default': 'bg-primary text-primary-foreground hover:bg-primary-hover aria-busy:disabled:bg-primary aria-busy:disabled:text-primary-foreground',
        'outline': 'border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background disabled:bg-transparent disabled:border-border aria-busy:disabled:border-foreground aria-busy:disabled:text-foreground',
        // For a dark photo: an ivory rule that fills with ivory on hover. The focus ring is inverted.
        'light': 'border border-background bg-transparent text-background hover:bg-background hover:text-foreground focus-visible:shadow-[0_0_0_2px_var(--foreground),0_0_0_4px_var(--background)] disabled:bg-transparent disabled:border-muted-foreground aria-busy:disabled:border-background aria-busy:disabled:text-background',
        'ghost': 'text-foreground hover:bg-accent disabled:bg-transparent aria-busy:disabled:text-foreground',
        'link': 'h-auto! p-0! text-body-sm! font-medium! tracking-normal! normal-case! text-link underline decoration-1 underline-offset-4 hover:text-muted-foreground disabled:bg-transparent',
        'destructive': 'bg-destructive text-destructive-foreground aria-busy:disabled:bg-destructive aria-busy:disabled:text-destructive-foreground',
      },
      size: {
        'sm': 'h-10 px-6',
        'default': 'h-12 px-6',
        'lg': 'h-14 px-6',
        'icon': 'size-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
