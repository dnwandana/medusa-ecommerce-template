<script setup lang="ts">
import { Star } from "@lucide/vue"

defineProps<{
  name: string
  invalid?: boolean
}>()

const rating = defineModel<number>({ required: true })
</script>

<template>
  <div class="inline-flex">
    <!-- Native radios keep the arrow keys and send the rating value in a native form. -->
    <label
      v-for="n in 5"
      :key="n"
      class="inline-flex size-11 cursor-pointer items-center justify-center has-[:focus-visible]:shadow-[var(--focus-ring)]"
    >
      <input
        type="radio"
        class="sr-only"
        :name="name"
        :value="n"
        :checked="rating === n"
        :aria-label="$t('common.ratingStar', { rating: n })"
        :aria-invalid="invalid ? 'true' : undefined"
        @change="rating = n"
      />
      <Star
        :stroke-width="1.5"
        aria-hidden="true"
        class="size-7"
        :class="rating >= n ? 'fill-star text-star' : 'text-icon-subtle'"
      />
    </label>
  </div>
</template>
