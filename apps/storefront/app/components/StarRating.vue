<script setup lang="ts">
import { Star, StarHalf } from "@lucide/vue"

const props = defineProps<{
  rating?: number
  mode?: "display" | "input"
  modelValue?: number | null
  name?: string
}>()

const emit = defineEmits<{ "update:modelValue": [value: number] }>()

// The display rounds to the nearest half star, from 0 to 5.
const half = computed(() => Math.min(5, Math.max(0, Math.round((props.rating ?? 0) * 2) / 2)))

function starKind(n: number): "full" | "half" | "empty" {
  if (n <= half.value) return "full"
  if (n - 0.5 === half.value) return "half"
  return "empty"
}
</script>

<template>
  <div v-if="mode === 'input'" class="inline-flex">
    <!-- Native radios keep the arrow keys and send the "rating" value in a native form. -->
    <label
      v-for="n in 5"
      :key="n"
      class="inline-flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-accent has-[:focus-visible]:shadow-focus"
    >
      <input
        type="radio"
        class="sr-only"
        :name="name ?? 'rating'"
        :value="n"
        :checked="modelValue === n"
        @change="emit('update:modelValue', n)"
      />
      <Star
        aria-hidden="true"
        class="size-7"
        :class="(modelValue ?? 0) >= n ? 'text-star fill-current' : 'text-icon-subtle'"
      />
      <span class="sr-only">{{ $t("reviews.average", { rating: n }) }}</span>
    </label>
  </div>
  <span
    v-else
    role="img"
    class="inline-flex items-center gap-0.5"
    :aria-label="$t('reviews.average', { rating: (rating ?? 0).toFixed(1) })"
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
        <Star class="size-4 text-icon-subtle" />
        <StarHalf class="absolute inset-0 size-4 text-star fill-current" />
      </template>
      <Star v-else-if="starKind(n) === 'full'" class="size-4 text-star fill-current" />
      <Star v-else class="size-4 text-icon-subtle" />
    </span>
  </span>
</template>
