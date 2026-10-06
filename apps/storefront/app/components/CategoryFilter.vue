<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { buttonVariants } from "~/components/ui/button"

defineProps<{
  categories: HttpTypes.StoreProductCategory[]
  // With no handle, "All products" is the current link.
  currentHandle?: string
}>()

const linkClass = buttonVariants({ variant: "outline", size: "sm" })
</script>

<template>
  <nav :aria-label="$t('products.categories')">
    <!-- Below md, the row scrolls to the side, so a long list of categories does not wrap. -->
    <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      <NuxtLinkLocale
        to="/products"
        :class="linkClass"
        class="shrink-0"
        :aria-current="currentHandle ? undefined : 'page'"
      >
        {{ $t("products.title") }}
      </NuxtLinkLocale>
      <NuxtLinkLocale
        v-for="category in categories"
        :key="category.id"
        :to="`/categories/${category.handle}`"
        :class="linkClass"
        class="shrink-0"
        :aria-current="category.handle === currentHandle ? 'page' : undefined"
      >
        {{ category.name }}
      </NuxtLinkLocale>
    </div>
  </nav>
</template>
