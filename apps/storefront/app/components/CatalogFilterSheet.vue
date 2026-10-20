<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { X } from "@lucide/vue"
import { useMediaQuery } from "@vueuse/core"
import type { CatalogFilterValues, FilterValue } from "~/composables/useCatalogListing"
import {
  clearFilters,
  toggleFilterValue,
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
  // "All" and the category links. The page gives them.
  categories?: { id: string; name: string; to: string; current: boolean }[]
}>()

const emit = defineEmits<{ "update:state": [state: CatalogState] }>()

const open = defineModel<boolean>("open", { default: false })

const { t } = useI18n()
const { settings } = useStorefront()
const idPrefix = useId()

// A phone gets the sheet from the bottom. A wider screen gets it from the right.
const wide = useMediaQuery("(min-width: 768px)")

// A radio item needs a string value, and the URL has no price for "Any price".
const ANY_PRICE = "any"
// A filter value has no product, so only the store colour list gives the hex.
const NO_PRODUCT = {} as HttpTypes.StoreProduct

type CheckSection = { name: "colour" | "fabric"; label: string; values: FilterValue[] }

const checkSections = computed<CheckSection[]>(() =>
  (
    [
      { name: "colour", label: t("listing.filters.colour"), values: props.values.colours },
      { name: "fabric", label: t("listing.filters.fabric"), values: props.values.fabrics },
    ] satisfies CheckSection[]
  ).filter((section) => section.values.length > 0)
)

const ranges = computed(() => priceRanges(props.priceLimits))
const priceOptions = computed(() => [
  { key: ANY_PRICE, label: t("listing.anyPrice") },
  ...ranges.value.map((range) => ({ key: range.key, label: priceRangeLabel(range, t) })),
])
const selectedPrice = computed(
  () => findPriceRange(props.priceLimits, props.state.price)?.key ?? ANY_PRICE
)

// The key is the original colour name. The label can be a translation, but the store colour
// names are the original names.
function hexOf(key: string): string | null {
  return colourHex(key, NO_PRODUCT, settings.value.colours)
}

function toggle(name: FilterName, key: string): void {
  emit("update:state", toggleFilterValue(props.state, name, key))
}

function setPrice(value: unknown): void {
  const price = typeof value === "string" && value !== ANY_PRICE ? value : null
  emit("update:state", { ...props.state, price, page: 1 })
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      :side="wide ? 'right' : 'bottom'"
      :show-close-button="false"
      class="gap-0 data-[side=bottom]:overflow-hidden data-[side=right]:w-[min(440px,100vw-48px)]"
    >
      <SheetHeader
        class="flex-row items-center justify-between border-b border-border px-4 py-2 md:px-6"
      >
        <SheetTitle class="text-h4">{{ $t("listing.sheetTitle") }}</SheetTitle>
        <SheetClose as-child>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="$t('listing.closeFilters')"
          >
            <X class="size-5" :stroke-width="1.5" aria-hidden="true" />
          </Button>
        </SheetClose>
      </SheetHeader>
      <SheetDescription class="sr-only">{{ $t("listing.sheetTitle") }}</SheetDescription>

      <!-- Only the sections scroll, so the title and the footer stay in view. -->
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-6">
        <section v-if="categories?.length" class="border-b border-border py-6">
          <h3 data-testid="filter-section-title" class="mb-3 text-field-label">
            {{ $t("listing.filters.category") }}
          </h3>
          <ul class="flex flex-col">
            <li v-for="category in categories" :key="category.id">
              <NuxtLinkLocale
                :to="category.to"
                :aria-current="category.current ? 'page' : undefined"
                class="group flex min-h-11 items-center gap-3 text-body focus-visible:shadow-focus focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  class="flex size-[18px] shrink-0 items-center justify-center rounded-full border border-foreground"
                >
                  <span v-if="category.current" class="size-2 rounded-full bg-primary" />
                </span>
                {{ category.name }}
              </NuxtLinkLocale>
            </li>
          </ul>
        </section>

        <section v-if="values.sizes.length" class="border-b border-border py-6">
          <h3 data-testid="filter-section-title" class="mb-3 text-field-label">
            {{ $t("listing.filters.size") }}
          </h3>
          <div class="grid grid-cols-3 gap-2 md:grid-cols-4">
            <button
              v-for="size in values.sizes"
              :key="size.key"
              type="button"
              :aria-pressed="state.size.includes(size.key) ? 'true' : 'false'"
              class="flex h-12 items-center justify-center border border-border text-body text-foreground outline-none hover:border-foreground focus-visible:shadow-focus aria-pressed:border-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              @click="toggle('size', size.key)"
            >
              {{ size.label }}
            </button>
          </div>
        </section>

        <section
          v-for="section in checkSections"
          :key="section.name"
          class="border-b border-border py-6"
        >
          <h3 data-testid="filter-section-title" class="mb-3 text-field-label">
            {{ section.label }}
          </h3>
          <ul class="flex flex-col">
            <li v-for="value in section.values" :key="value.key">
              <label
                :for="`${idPrefix}-${section.name}-${value.key}`"
                class="flex min-h-11 cursor-pointer items-center gap-3 text-body"
              >
                <Checkbox
                  :id="`${idPrefix}-${section.name}-${value.key}`"
                  :model-value="state[section.name].includes(value.key)"
                  @update:model-value="toggle(section.name, value.key)"
                />
                <span
                  v-if="section.name === 'colour' && hexOf(value.key)"
                  class="size-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(31_27_23/0.2)]"
                  :style="{ backgroundColor: hexOf(value.key)! }"
                  aria-hidden="true"
                />
                {{ value.label }}
              </label>
            </li>
          </ul>
        </section>

        <section v-if="ranges.length" class="py-6">
          <h3 data-testid="filter-section-title" class="mb-3 text-field-label">
            {{ $t("listing.filters.price") }}
          </h3>
          <RadioGroup
            :model-value="selectedPrice"
            :aria-label="$t('listing.filters.price')"
            class="gap-0"
            @update:model-value="setPrice"
          >
            <label
              v-for="option in priceOptions"
              :key="option.key"
              :for="`${idPrefix}-price-${option.key}`"
              class="flex min-h-11 cursor-pointer items-center gap-3 text-body"
            >
              <RadioGroupItem :id="`${idPrefix}-price-${option.key}`" :value="option.key" />
              {{ option.label }}
            </label>
          </RadioGroup>
        </section>
      </div>

      <SheetFooter class="grid grid-cols-2 gap-2 border-t border-border px-4 py-4 md:px-6">
        <Button type="button" variant="outline" @click="emit('update:state', clearFilters(state))">
          {{ $t("listing.clearAll") }}
        </Button>
        <Button type="button" @click="open = false">
          {{ $t("listing.showCount", { count }, count) }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
