<script setup lang="ts">
// The region has a name, so a screen reader can skip it. The bar is not sticky, so it scrolls away.
const { t } = useI18n()
const line = computed(() => t("shell.announcement"))
</script>

<template>
  <div
    role="region"
    :aria-label="line"
    class="flex h-9 items-center justify-center bg-foreground px-4 text-center text-[11px] leading-4 font-medium tracking-[0.16em] text-background uppercase"
  >
    {{ line }}
  </div>
</template>
