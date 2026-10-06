<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<template>
  <section class="flex justify-center pt-8 pb-16 md:pt-16 md:pb-24">
    <div class="flex w-full max-w-[400px] flex-col items-center gap-6">
      <slot name="before" />
      <h1
        class="font-heading text-[24px] leading-[30px] font-[650] tracking-[-0.015em] md:text-[26px] md:leading-8"
      >
        {{ title }}
      </h1>
      <Card class="w-full">
        <CardContent>
          <slot />
        </CardContent>
      </Card>
      <slot name="after" />
    </div>
  </section>
</template>
