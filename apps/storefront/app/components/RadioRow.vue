<script setup lang="ts">
import { injectRadioGroupRootContext } from "reka-ui"

const props = defineProps<{
  value: string
  title: string
  caption?: string
  aside?: string
  single?: boolean
}>()

const group = injectRadioGroupRootContext(null)
const id = useId()

// A single row is the only option, so it always shows as selected.
const selected = computed(() => props.single || group?.modelValue.value === props.value)
</script>

<template>
  <!-- The hairline is under the row and its slot, so the slot reads as a part of the row. -->
  <div
    data-slot="radio-row"
    :data-state="selected ? 'checked' : 'unchecked'"
    class="border-b border-border"
  >
    <div v-if="single" class="flex min-h-16 items-center gap-4 py-4">
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-body text-foreground">
          <slot name="title">{{ title }}</slot>
        </span>
        <span v-if="caption || $slots.caption" class="text-body-sm text-muted-foreground">
          <slot name="caption">{{ caption }}</slot>
        </span>
      </span>
      <span v-if="aside" class="shrink-0 text-price text-foreground">{{ aside }}</span>
    </div>
    <!-- The label makes the full row the target of the radio. -->
    <label v-else :for="id" class="flex min-h-16 cursor-pointer items-center gap-4 py-4">
      <RadioGroupItem :id="id" :value="value" />
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-body text-foreground">
          <slot name="title">{{ title }}</slot>
        </span>
        <span v-if="caption || $slots.caption" class="text-body-sm text-muted-foreground">
          <slot name="caption">{{ caption }}</slot>
        </span>
      </span>
      <span v-if="aside" class="shrink-0 text-price text-foreground">{{ aside }}</span>
    </label>
    <div v-if="selected && $slots.default" class="pt-2 pb-4">
      <slot />
    </div>
  </div>
</template>
