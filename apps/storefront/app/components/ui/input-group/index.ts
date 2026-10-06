import type { VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '@/components/ui/button'
import { cva } from 'class-variance-authority'

export { default as InputGroup } from './InputGroup.vue'
export { default as InputGroupAddon } from './InputGroupAddon.vue'
export { default as InputGroupButton } from './InputGroupButton.vue'
export { default as InputGroupInput } from './InputGroupInput.vue'
export { default as InputGroupText } from './InputGroupText.vue'
export { default as InputGroupTextarea } from './InputGroupTextarea.vue'

export const inputGroupAddonVariants = cva(
  'flex h-auto shrink-0 cursor-text select-none items-center justify-center gap-2 text-body-sm font-medium text-icon-subtle group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*=size-])]:size-4',
  {
    variants: {
      align: {
        'inline-start': 'pl-3 order-first',
        'inline-end': 'pr-3 order-last',
        'block-start': 'px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2 order-first w-full justify-start',
        'block-end': 'px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2 order-last w-full justify-start',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
)

export type InputGroupVariants = VariantProps<typeof inputGroupAddonVariants>

export const inputGroupButtonVariants = cva(
  'flex shrink-0 items-center gap-2 text-body-sm shadow-none',
  {
    variants: {
      size: {
        // The button fills the 42px inner height at the right end. No padding keeps the icon in the centre.
        'icon': 'size-[42px] p-0 rounded-none rounded-r-[7px]',
        'xs': 'h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*=size-])]:size-3.5',
        'sm': '',
        'icon-xs': 'size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0',
        'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
      },
    },
    defaultVariants: {
      size: 'icon',
    },
  },
)

export type InputGroupButtonVariants = VariantProps<typeof inputGroupButtonVariants>

export interface InputGroupButtonProps {
  variant?: ButtonVariants['variant']
  size?: InputGroupButtonVariants['size']
  class?: HTMLAttributes['class']
}
