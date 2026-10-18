<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: "header" | "footer" | "email" }>(), {
  size: "header",
})

const { brand } = useAppConfig()
const localePath = useLocalePath()

const SIZE_CLASSES = {
  header: "text-[22px] leading-7 md:text-[28px] md:leading-8",
  footer: "text-[32px] leading-10",
  email: "text-2xl leading-7",
} as const
</script>

<template>
  <!-- The left padding is equal to the tracking, so the letters stay in the centre. -->
  <NuxtLink
    :to="localePath('/')"
    :data-size="props.size"
    :class="SIZE_CLASSES[props.size]"
    class="inline-flex min-h-11 items-center pl-[0.24em] font-heading font-medium tracking-[0.24em] whitespace-nowrap text-foreground uppercase outline-none focus-visible:shadow-focus"
  >
    {{ brand.name }}
  </NuxtLink>
</template>
