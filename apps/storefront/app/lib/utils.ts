import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// tailwind-merge reads an unknown `text-*` class as a colour. Thus it removes a type
// utility from tailwind.css when a `text-<colour>` class is in the same call.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "h4", "body-lg", "body-sm", "caption", "price", "price-lg"] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
