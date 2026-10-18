<script setup lang="ts">
import type { TrackerCaption, TrackerStep, TrackerStepId } from "~/utils/orderTracker"

defineProps<{ steps: TrackerStep[] }>()

const { locale } = useI18n()

const STEP_KEYS: Record<TrackerStepId, string> = {
  confirmed: "order.tracker.confirmed",
  on_its_way: "order.tracker.onItsWay",
  delivered: "order.tracker.delivered",
}

const CAPTION_KEYS: Record<TrackerCaption, string> = {
  waiting_for_payment: "order.tracker.waitingForPayment",
  checking_receipt: "order.tracker.checkingReceipt",
  partly_shipped: "order.tracker.partlyShipped",
}

const stateKey = (step: TrackerStep): string =>
  step.complete
    ? "order.tracker.done"
    : step.current
      ? "order.tracker.current"
      : "order.tracker.upcoming"
</script>

<template>
  <ol :aria-label="$t('order.tracker.label')" class="grid grid-cols-3 gap-x-4">
    <li
      v-for="step in steps"
      :key="step.id"
      :data-testid="`tracker-${step.id}`"
      :aria-current="step.current ? 'step' : undefined"
      class="group flex min-w-0 flex-col gap-3"
    >
      <!-- The point and the line only repeat the state. The sr-only text carries it. -->
      <span class="flex items-center" aria-hidden="true">
        <span
          class="size-[11px] flex-none rounded-full"
          :class="
            step.complete
              ? 'bg-foreground'
              : step.current
                ? 'bg-background shadow-[inset_0_0_0_2px_var(--foreground)]'
                : 'bg-background shadow-[inset_0_0_0_1px_var(--input)]'
          "
        />
        <span
          class="flex-auto border-t group-last:border-transparent"
          :class="step.complete ? 'border-foreground' : 'border-border'"
        />
      </span>
      <span
        class="text-body-sm font-medium break-words"
        :class="step.complete || step.current ? 'text-foreground' : 'text-muted-foreground'"
      >
        {{ $t(STEP_KEYS[step.id]) }}
      </span>
      <span v-if="step.complete && step.date" class="text-caption text-muted-foreground">
        {{ formatStepTime(step.date, locale) }}
      </span>
      <span
        v-if="step.caption"
        class="text-caption break-words"
        :class="step.current ? 'text-warning' : 'text-muted-foreground'"
      >
        {{ $t(CAPTION_KEYS[step.caption]) }}
      </span>
      <span class="sr-only">{{ $t(stateKey(step)) }}</span>
    </li>
  </ol>
</template>
