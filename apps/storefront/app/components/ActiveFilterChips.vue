<script setup lang="ts">
import { X } from "@lucide/vue"
import type { CatalogFilterValues, FilterValue } from "~/composables/useCatalogListing"
import { toggleFilterValue, type CatalogState, type FilterName } from "~/utils/catalogQuery"
import { findPriceRange, priceRangeLabel } from "~/utils/priceRanges"

const props = defineProps<{
  state: CatalogState
  values: CatalogFilterValues
  priceLimits: number[]
}>()

const emit = defineEmits<{ "update:state": [state: CatalogState] }>()

const { t } = useI18n()

type Chip = { id: string; label: string; next: CatalogState }

const FILTERS: Array<{ name: FilterName; values: keyof CatalogFilterValues }> = [
  { name: "size", values: "sizes" },
  { name: "colour", values: "colours" },
  { name: "fabric", values: "fabrics" },
]

// The label of a size alone ("XS") does not tell the filter, so the size chip names it.
function chipLabel(name: FilterName, value: FilterValue): string {
  return name === "size" ? `${t("listing.filters.size")} ${value.label}` : value.label
}

// A selected key that the filter values do not know gets no chip, as it has no effect on the list.
const chips = computed<Chip[]>(() => {
  const list: Chip[] = []
  for (const filter of FILTERS) {
    for (const value of props.values[filter.values]) {
      if (props.state[filter.name].includes(value.key)) {
        list.push({
          id: `${filter.name}:${value.key}`,
          label: chipLabel(filter.name, value),
          next: toggleFilterValue(props.state, filter.name, value.key),
        })
      }
    }
  }
  const range = findPriceRange(props.priceLimits, props.state.price)
  if (range) {
    list.push({
      id: `price:${range.key}`,
      label: priceRangeLabel(range, t),
      next: { ...props.state, price: null, page: 1 },
    })
  }
  return list
})
</script>

<template>
  <ul v-if="chips.length" class="flex flex-wrap items-center gap-2">
    <li v-for="chip in chips" :key="chip.id">
      <button
        type="button"
        class="inline-flex h-11 items-center gap-2 bg-secondary px-3 text-[10px] leading-4 font-semibold tracking-[0.16em] uppercase transition-colors hover:bg-accent focus-visible:shadow-focus focus-visible:outline-none"
        :aria-label="$t('listing.removeFilter', { name: chip.label })"
        @click="emit('update:state', chip.next)"
      >
        {{ chip.label }}
        <X class="size-3.5" :stroke-width="1.5" aria-hidden="true" />
      </button>
    </li>
  </ul>
</template>
