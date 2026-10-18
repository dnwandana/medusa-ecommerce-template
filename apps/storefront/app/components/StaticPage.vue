<script lang="ts">
export type StaticPageName = "delivery" | "returns" | "about" | "privacy" | "terms"
</script>

<script setup lang="ts">
const props = defineProps<{ name: StaticPageName }>()

const { t, tm, rt } = useI18n()

type Section = { heading: string; body: string }

// tm() gives the raw messages of the active locale, and rt() renders each one. Thus the list
// changes with the locale.
const sections = computed<Section[]>(() =>
  (tm(`pages.${props.name}.sections`) as unknown as Record<keyof Section, unknown>[]).map(
    (section) => ({
      heading: rt(section.heading as Parameters<typeof rt>[0]),
      body: rt(section.body as Parameters<typeof rt>[0]),
    })
  )
)

useHead({ title: () => t(`pages.${props.name}.title`) })
</script>

<template>
  <article class="mx-auto max-w-[720px] pt-10 pb-16 md:pt-16 md:pb-24">
    <header>
      <h1 class="text-h1">{{ t(`pages.${name}.title`) }}</h1>
      <p class="mt-4 text-body-lg text-muted-foreground">{{ t(`pages.${name}.intro`) }}</p>
    </header>
    <section
      v-for="section in sections"
      :key="section.heading"
      class="mt-16"
      data-testid="static-page-section"
    >
      <h2 class="text-h3">{{ section.heading }}</h2>
      <p class="mt-3 text-body">{{ section.body }}</p>
    </section>
  </article>
</template>
