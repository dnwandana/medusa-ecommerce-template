<script setup lang="ts">
import type { AcceptableValue } from "reka-ui"
import { RadioGroupItem, RadioGroupRoot } from "reka-ui"

const props = defineProps<{
  modelValue: string | null
  values: { value: string; hex: string | null }[]
  label: string
}>()

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const { t } = useI18n()

// A swatch needs a colour. When one value has no hex, all values show as text cells, so the
// set stays the same kind of control.
const allHaveHex = computed(() => props.values.every((item) => !!item.hex))
const cells = computed(() => props.values.map((item) => ({ value: item.value, soldOut: false })))

function select(value: AcceptableValue): void {
  if (typeof value === "string") emit("update:modelValue", value)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="text-field-label">
      {{ label }}
      <span
        v-if="modelValue"
        class="ml-1 text-muted-foreground"
        data-testid="colour-swatches-selected"
        >{{ modelValue }}</span
      >
    </p>
    <RadioGroupRoot
      v-if="allHaveHex"
      :model-value="modelValue"
      :aria-label="label"
      class="flex flex-wrap gap-1"
      @update:model-value="select"
    >
      <RadioGroupItem
        v-for="item in values"
        :key="item.value"
        :value="item.value"
        :aria-label="item.value"
        :title="item.value"
        class="group flex size-11 items-center justify-center rounded-full outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <!-- The hairline keeps a white swatch visible on the white page. The selected dot gets
             an ink ring with a 2 px gap. -->
        <span
          data-slot="swatch-dot"
          aria-hidden="true"
          class="size-8 rounded-full inset-ring inset-ring-foreground/15 group-data-[state=checked]:ring-1 group-data-[state=checked]:ring-foreground group-data-[state=checked]:ring-offset-2 group-data-[state=checked]:ring-offset-background"
          :style="{ backgroundColor: item.hex ?? undefined }"
        />
      </RadioGroupItem>
    </RadioGroupRoot>
    <SizeCells
      v-else
      :model-value="modelValue"
      :sizes="cells"
      :label="label"
      :sold-out-label="t('products.badges.soldOut')"
      @update:model-value="select"
    />
  </div>
</template>
