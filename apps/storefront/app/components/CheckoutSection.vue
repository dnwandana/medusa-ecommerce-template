<script setup lang="ts">
import { Lock } from "@lucide/vue"

const props = defineProps<{
  number: number
  title: string
  waiting?: string | null
}>()

// Four sections are on one page, so the number makes each heading id unique.
const headingId = computed(() => `checkout-section-${props.number}`)
const label = computed(() => String(props.number).padStart(2, "0"))
</script>

<template>
  <section :aria-labelledby="headingId" :data-testid="headingId" class="flex flex-col gap-6">
    <div class="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-4">
      <!-- The number is aria-hidden, so a screen reader reads only the title. -->
      <h2
        :id="headingId"
        class="text-h3 font-normal"
        :class="waiting ? 'text-muted-foreground' : 'text-foreground'"
      >
        <span class="mr-3 text-muted-foreground" aria-hidden="true">{{ label }}</span
        >{{ title }}
      </h2>
      <slot v-if="!waiting" name="aside" />
    </div>

    <!-- A section that waits for the step before it shows only the text of that step. -->
    <p v-if="waiting" class="flex items-center gap-2 text-body-sm text-muted-foreground">
      <Lock class="size-4 shrink-0" :stroke-width="1.5" aria-hidden="true" />
      {{ waiting }}
    </p>
    <slot v-else />
  </section>
</template>
