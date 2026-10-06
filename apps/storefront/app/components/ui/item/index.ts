import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Item } from './Item.vue'
export { default as ItemActions } from './ItemActions.vue'
export { default as ItemContent } from './ItemContent.vue'
export { default as ItemDescription } from './ItemDescription.vue'
export { default as ItemFooter } from './ItemFooter.vue'
export { default as ItemGroup } from './ItemGroup.vue'
export { default as ItemHeader } from './ItemHeader.vue'
export { default as ItemMedia } from './ItemMedia.vue'
export { default as ItemSeparator } from './ItemSeparator.vue'
export { default as ItemTitle } from './ItemTitle.vue'

export const itemVariants = cva(
  'group/item flex w-full flex-wrap items-start gap-4 text-body-sm transition-colors duration-100 outline-none focus-visible:shadow-focus [a]:hover:bg-accent [a]:transition-colors',
  {
    variants: {
      variant: {
        default: 'py-4',
        outline: 'border border-border bg-card rounded-lg p-4',
        muted: 'bg-muted rounded-lg p-4',
      },
      size: {
        default: '',
        sm: 'gap-3',
        xs: 'gap-2 in-data-[slot=dropdown-menu-content]:p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export const itemMediaVariants = cva(
  'gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start flex shrink-0 items-center justify-center [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: '[&_svg:not([class*=size-])]:size-4',
        image: 'size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type ItemVariants = VariantProps<typeof itemVariants>
export type ItemMediaVariants = VariantProps<typeof itemMediaVariants>
