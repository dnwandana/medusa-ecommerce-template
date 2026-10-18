<script setup lang="ts">
const props = defineProps<{ label: string; count?: number; to?: string }>()

// The caller gives a path with no locale prefix, as for each NuxtLinkLocale.
const NuxtLinkLocale = resolveComponent("NuxtLinkLocale")

const countText = computed(() => {
  const count = props.count ?? 0
  if (count <= 0) return null
  return count > 99 ? "99+" : String(count)
})
</script>

<template>
  <component
    :is="props.to ? NuxtLinkLocale : 'button'"
    :to="props.to"
    :type="props.to ? undefined : 'button'"
    :aria-label="props.label"
    class="relative inline-flex size-11 shrink-0 items-center justify-center text-foreground transition-colors duration-250 outline-none hover:bg-accent focus-visible:shadow-focus [&_svg:not([class*=size-])]:size-5"
  >
    <slot />
    <!-- The caller puts the count in the label, so a screen reader skips the dot. -->
    <span
      v-if="countText"
      data-slot="count"
      aria-hidden="true"
      class="absolute top-1.5 right-1 h-4 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums"
    >
      {{ countText }}
    </span>
  </component>
</template>
