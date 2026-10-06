<script setup lang="ts">
import { Check } from "@lucide/vue"

defineProps<{ current: 1 | 2 | 3 }>()

const steps = [
  { step: 1, title: "checkout.steps.address" },
  { step: 2, title: "checkout.steps.shipping" },
  { step: 3, title: "checkout.steps.payment" },
] as const
</script>

<template>
  <!-- The stepper shows the progress only. It has no StepperTrigger, so no step is a button. -->
  <Stepper :model-value="current" class="flex items-start gap-1 md:items-center md:gap-3">
    <StepperItem
      v-for="{ step, title } in steps"
      :key="step"
      :step="step"
      :data-testid="`step-${step}`"
      class="flex-col gap-1.5 text-center last:flex-1 md:flex-row md:gap-2.5 md:text-left md:last:flex-none"
    >
      <StepperIndicator>
        <Check v-if="step < current" aria-hidden="true" class="size-4" />
        <template v-else>{{ step }}</template>
      </StepperIndicator>
      <StepperTitle class="text-[13px] leading-[18px] whitespace-normal md:text-body-sm md:leading-5 md:whitespace-nowrap">
        {{ $t(title) }}
      </StepperTitle>
      <StepperSeparator v-if="step < 3" class="hidden md:block" />
    </StepperItem>
  </Stepper>
</template>
