<script setup lang="ts">
const props = defineProps<{ label: string; value?: number }>()

// A value outside 0 to 100 would draw a bar wider than the track.
const percent = computed<number | null>(() =>
  typeof props.value === "number" ? Math.min(100, Math.max(0, props.value)) : null
)
</script>

<template>
  <div
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="percent ?? undefined"
    :aria-valuemin="percent === null ? undefined : 0"
    :aria-valuemax="percent === null ? undefined : 100"
    class="relative h-0.5 w-full overflow-hidden"
  >
    <!-- The track is 2 px high, so overflow-hidden clips the moving bar and not its height. -->
    <div class="absolute inset-x-0 bottom-0 h-px bg-border" />
    <div
      v-if="percent === null"
      data-slot="bar"
      class="absolute top-0 left-0 h-0.5 w-1/3 bg-primary animate-[progress-rule_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
    />
    <div
      v-else
      data-slot="bar"
      class="absolute top-0 left-0 h-0.5 bg-primary transition-[width] duration-300 motion-reduce:transition-none"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>

<style>
/* Not scoped: a scoped style renames the keyframes, and the Tailwind class uses this name. */
@keyframes progress-rule {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(300%);
  }
}
</style>
