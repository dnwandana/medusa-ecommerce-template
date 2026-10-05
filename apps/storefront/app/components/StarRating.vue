<script setup lang="ts">
const props = defineProps<{ rating: number }>()

// The number of filled stars, from 0 to 5.
const filled = computed(() => Math.min(5, Math.max(0, Math.round(props.rating))))
</script>

<template>
  <span role="img" :aria-label="$t('reviews.average', { rating: rating.toFixed(1) })">
    <span
      v-for="n in 5"
      :key="n"
      aria-hidden="true"
      :data-filled="n <= filled"
      :class="n <= filled ? 'text-amber-500' : 'text-neutral-300'"
      >★</span
    >
  </span>
</template>
