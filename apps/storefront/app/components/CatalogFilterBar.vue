<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { ChevronDown, SlidersHorizontal } from "@lucide/vue"
import type { CatalogFilterValues, FilterValue } from "~/composables/useCatalogListing"
import {
  activeFilterCount,
  clearFilters,
  toggleFilterValue,
  type CatalogSort,
  type CatalogState,
  type FilterName,
} from "~/utils/catalogQuery"
import { colourHex } from "~/utils/colourDots"
import { findPriceRange, priceRangeLabel, priceRanges } from "~/utils/priceRanges"

const props = defineProps<{
  state: CatalogState
  values: CatalogFilterValues
  priceLimits: number[]
  count: number
}>()

const emit = defineEmits<{ "update:state": [state: CatalogState]; "open-sheet": [] }>()

const { t } = useI18n()
const { settings } = useStorefront()
const sortId = useId()
const phoneSortId = useId()

// A radio item needs a string value, and the URL has no price for "Any price".
const ANY_PRICE = "any"
// A filter value has no product, so only the store colour list gives the hex.
const NO_PRODUCT = {} as HttpTypes.StoreProduct

const SORTS: Array<{ value: CatalogSort; key: string }> = [
  { value: "newest", key: "listing.sort.newest" },
  { value: "price-asc", key: "listing.sort.priceAsc" },
  { value: "price-desc", key: "listing.sort.priceDesc" },
]

type FilterMenu = { name: FilterName; label: string; values: FilterValue[] }

// A filter with no value does not show.
const filters = computed<FilterMenu[]>(() =>
  (
    [
      { name: "size", label: t("listing.filters.size"), values: props.values.sizes },
      { name: "colour", label: t("listing.filters.colour"), values: props.values.colours },
      { name: "fabric", label: t("listing.filters.fabric"), values: props.values.fabrics },
    ] satisfies FilterMenu[]
  ).filter((filter) => filter.values.length > 0)
)

const ranges = computed(() => priceRanges(props.priceLimits))
const selectedPrice = computed(
  () => findPriceRange(props.priceLimits, props.state.price)?.key ?? ANY_PRICE
)
const activeCount = computed(() => activeFilterCount(props.state))

function triggerLabel(label: string, selected: number): string {
  return selected > 0 ? `${label} (${selected})` : label
}

function hexOf(name: string): string | null {
  return colourHex(name, NO_PRODUCT, settings.value.colours)
}

function toggle(name: FilterName, key: string): void {
  emit("update:state", toggleFilterValue(props.state, name, key))
}

function setPrice(value: unknown): void {
  const price = typeof value === "string" && value !== ANY_PRICE ? value : null
  emit("update:state", { ...props.state, price, page: 1 })
}

function setSort(value: string | undefined): void {
  const sort = SORTS.find((item) => item.value === value)?.value ?? "newest"
  emit("update:state", { ...props.state, sort, page: 1 })
}

// The menu stays open, so the shopper can select more than one value.
function keepOpen(event: Event): void {
  event.preventDefault()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="hidden items-center gap-6 md:flex">
      <!-- The sort is outside the filter row, so the row text names only the filters. -->
      <div data-testid="filter-row" class="flex flex-1 items-center justify-between gap-6">
        <div class="flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" class="px-3" @click="emit('open-sheet')">
            <SlidersHorizontal class="size-4.5" :stroke-width="1.5" aria-hidden="true" />
            {{ $t("listing.allFilters") }}
          </Button>
          <DropdownMenu v-for="filter in filters" :key="filter.name">
            <DropdownMenuTrigger as-child>
              <Button type="button" variant="ghost" class="px-3">
                {{ triggerLabel(filter.label, state[filter.name].length) }}
                <ChevronDown class="size-3.5" :stroke-width="1.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-auto">
              <DropdownMenuLabel class="text-eyebrow">{{ filter.label }}</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                v-for="value in filter.values"
                :key="value.key"
                :model-value="state[filter.name].includes(value.key)"
                @select="keepOpen"
                @update:model-value="toggle(filter.name, value.key)"
              >
                <span
                  v-if="filter.name === 'colour' && hexOf(value.label)"
                  class="size-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(31_27_23/0.2)]"
                  :style="{ backgroundColor: hexOf(value.label)! }"
                  aria-hidden="true"
                />
                {{ value.label }}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu v-if="ranges.length">
            <DropdownMenuTrigger as-child>
              <Button type="button" variant="ghost" class="px-3">
                {{ triggerLabel($t("listing.filters.price"), selectedPrice === ANY_PRICE ? 0 : 1) }}
                <ChevronDown class="size-3.5" :stroke-width="1.5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-auto">
              <DropdownMenuLabel class="text-eyebrow">
                {{ $t("listing.filters.price") }}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup :model-value="selectedPrice" @update:model-value="setPrice">
                <DropdownMenuRadioItem :value="ANY_PRICE">
                  {{ $t("listing.anyPrice") }}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem v-for="range in ranges" :key="range.key" :value="range.key">
                  {{ priceRangeLabel(range, t) }}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p class="text-caption text-muted-foreground tabular-nums">
          {{ $t("listing.count", { count }, count) }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <label :for="sortId" class="text-field-label text-muted-foreground">
          {{ $t("listing.sort.label") }}
        </label>
        <div class="w-48">
          <NativeSelect
            :id="sortId"
            class="text-body-sm"
            :model-value="state.sort"
            @update:model-value="setSort"
          >
            <option v-for="sort in SORTS" :key="sort.value" :value="sort.value">
              {{ $t(sort.key) }}
            </option>
          </NativeSelect>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4 md:hidden">
      <div class="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          class="px-2"
          data-testid="filter-button"
          @click="emit('open-sheet')"
        >
          <SlidersHorizontal class="size-4.5" :stroke-width="1.5" aria-hidden="true" />
          {{ $t("listing.filterButton", { count: activeCount }, activeCount) }}
        </Button>
        <p class="text-caption text-muted-foreground tabular-nums">
          {{ $t("listing.count", { count }, count) }}
        </p>
      </div>
      <div class="w-40">
        <label :for="phoneSortId" class="sr-only">{{ $t("listing.sort.label") }}</label>
        <NativeSelect
          :id="phoneSortId"
          class="text-body-sm"
          :model-value="state.sort"
          @update:model-value="setSort"
        >
          <option v-for="sort in SORTS" :key="sort.value" :value="sort.value">
            {{ $t(sort.key) }}
          </option>
        </NativeSelect>
      </div>
    </div>

    <div v-if="activeCount > 0" class="flex flex-wrap items-center gap-2">
      <span class="mr-2 text-caption text-muted-foreground">{{ $t("listing.showing") }}</span>
      <ActiveFilterChips
        :state="state"
        :values="values"
        :price-limits="priceLimits"
        @update:state="emit('update:state', $event)"
      />
      <Button
        type="button"
        variant="link"
        class="ml-2 min-h-11"
        @click="emit('update:state', clearFilters(state))"
      >
        {{ $t("listing.clearAll") }}
      </Button>
    </div>
  </div>
</template>
