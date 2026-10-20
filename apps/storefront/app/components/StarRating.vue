<script setup lang="ts">
import { Star, StarHalf } from "@lucide/vue"

const props = defineProps<{
  rating: number
  count?: number
  showValue?: boolean
  size?: "sm" | "md"
}>()

// The display rounds to the nearest half star, from 0 to 5.
const half = computed(() => Math.min(5, Math.max(0, Math.round((props.rating ?? 0) * 2) / 2)))

const value = computed(() => (props.rating ?? 0).toFixed(1))

const starClass = computed(() => (props.size === "sm" ? "size-3.5" : "size-4"))

function starKind(n: number): "full" | "half" | "empty" {
  if (n <= half.value) return "full"
  if (n - 0.5 === half.value) return "half"
  return "empty"
}
</script>

<template>
  <span class="inline-flex items-center gap-2">
    <span
      role="img"
      class="inline-flex items-center gap-0.5"
      :aria-label="$t('common.rating', { rating: value })"
    >
      <span
        v-for="n in 5"
        :key="n"
        aria-hidden="true"
        class="relative inline-flex"
        :data-filled="starKind(n) !== 'empty'"
        :data-half="starKind(n) === 'half' ? 'true' : undefined"
      >
        <template v-if="starKind(n) === 'half'">
          <!-- The half star sits on an empty star, so the star keeps its full outline. -->
          <Star :class="[starClass, 'text-icon-subtle']" />
          <StarHalf :class="[starClass, 'absolute inset-0 fill-current text-star']" />
        </template>
        <Star v-else-if="starKind(n) === 'full'" :class="[starClass, 'fill-current text-star']" />
        <Star v-else :class="[starClass, 'text-icon-subtle']" />
      </span>
    </span>
    <!-- The accessible name of the stars already has the value, so the texts are hidden. -->
    <span
      v-if="showValue"
      data-slot="rating-value"
      aria-hidden="true"
      class="text-price text-foreground"
    >
      {{ value }}
    </span>
    <span
      v-if="count !== undefined"
      data-slot="rating-count"
      aria-hidden="true"
      class="text-caption text-muted-foreground"
    >
      ({{ $t("common.ratingCount", { count }, count) }})
    </span>
  </span>
</template>
