<script setup lang="ts">
import { ArrowRight } from "@lucide/vue"
import type { HomeCategory } from "~/composables/useHomeCategories"

const props = defineProps<{ categories: HomeCategory[] }>()

// Desktop shows up to 4 tiles in one row. A fifth tile starts a new row.
const columnsClass = computed(() =>
  props.categories.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"
)
</script>

<template>
  <section v-if="categories.length" aria-labelledby="home-categories-title">
    <h2 id="home-categories-title" class="mb-6 text-h2 md:mb-12">
      {{ $t("home.categoriesTitle") }}
    </h2>
    <!-- Phones show one sideways row that snaps to each tile. The row runs to the screen edge. -->
    <div
      class="-mr-4 grid snap-x snap-mandatory [scrollbar-width:none] auto-cols-[260px] grid-flow-col gap-3 overflow-x-auto pr-4 md:mr-0 md:auto-cols-auto md:grid-flow-row md:gap-x-8 md:gap-y-12 md:overflow-visible md:pr-0"
      :class="columnsClass"
    >
      <NuxtLinkLocale
        v-for="category in categories"
        :key="category.id"
        :to="`/categories/${category.handle}`"
        data-testid="category-tile"
        class="group flex snap-start flex-col gap-4 text-foreground outline-none focus-visible:shadow-focus"
      >
        <div class="overflow-hidden bg-backdrop-sand" style="aspect-ratio: 4 / 5">
          <!-- The name under the photo is the text of the link. Thus the photo has an empty alt. -->
          <img
            v-if="category.image"
            :src="category.image"
            alt=""
            loading="lazy"
            class="size-full object-cover"
          />
        </div>
        <span class="flex items-center justify-between gap-4">
          <span class="text-nav group-hover:underline group-hover:underline-offset-4">
            {{ category.name }}
          </span>
          <ArrowRight class="size-[18px] shrink-0" :stroke-width="1.5" aria-hidden="true" />
        </span>
      </NuxtLinkLocale>
    </div>
  </section>
</template>
