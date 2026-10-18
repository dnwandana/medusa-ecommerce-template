<script setup lang="ts">
import { RotateCcw, Ruler, Truck } from "@lucide/vue"

type ServiceMessage = { title: unknown; body: unknown }

const { tm, rt } = useI18n()

// The icons follow the order of the items in the locale files.
const ICONS = [Truck, RotateCcw, Ruler]

// tm returns the compiled messages of the list, and rt turns each message into text.
const items = computed(() =>
  (tm("home.service") as unknown as ServiceMessage[]).map((item, index) => ({
    icon: ICONS[index] ?? Truck,
    title: rt(item.title as Parameters<typeof rt>[0]),
    body: rt(item.body as Parameters<typeof rt>[0]),
  }))
)
</script>

<template>
  <section :aria-label="$t('home.serviceLabel')">
    <!-- Phones stack the items with a rule under each. Desktop shows them in one row. -->
    <div class="grid border-t border-border md:grid-cols-3 md:gap-8 md:pt-10">
      <div
        v-for="item in items"
        :key="item.title"
        class="flex flex-col gap-2 border-b border-border py-6 md:border-b-0 md:py-0"
      >
        <component :is="item.icon" class="mb-2 size-5" :stroke-width="1.5" aria-hidden="true" />
        <h3 class="text-h4">{{ item.title }}</h3>
        <p class="text-body-sm text-muted-foreground">{{ item.body }}</p>
      </div>
    </div>
  </section>
</template>
