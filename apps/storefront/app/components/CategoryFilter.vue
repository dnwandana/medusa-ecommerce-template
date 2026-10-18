<script setup lang="ts">
import type { CategoryLink } from "~/utils/categoryLinks"

defineProps<{ links: CategoryLink[] }>()
</script>

<template>
  <!-- One link is only the current page, so the row does not show. -->
  <!-- Below md, the row scrolls to the side, so a long list of categories does not wrap. -->
  <nav
    v-if="links.length > 1"
    :aria-label="$t('products.categories')"
    class="-mr-4 flex gap-6 overflow-x-auto pr-4 [scrollbar-width:none] md:mr-0 md:flex-wrap md:gap-x-7 md:gap-y-2 md:overflow-visible md:pr-0"
  >
    <NuxtLinkLocale
      v-for="link in links"
      :key="link.id"
      :to="link.to"
      class="inline-flex min-h-11 shrink-0 items-center caps text-foreground underline-offset-8 outline-none hover:underline focus-visible:shadow-focus"
      :class="{ 'underline decoration-1': link.current }"
      :aria-current="link.current ? 'page' : undefined"
    >
      {{ link.name }}
    </NuxtLinkLocale>
  </nav>
</template>
