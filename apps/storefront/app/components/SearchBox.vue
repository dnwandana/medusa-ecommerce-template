<script setup lang="ts">
import { Search } from "@lucide/vue"
import { onClickOutside } from "@vueuse/core"

const localePath = useLocalePath()

const text = ref("")
const { products, pending, active } = useSearchSuggestions(text)

const root = useTemplateRef<HTMLElement>("root")
const input = useTemplateRef<HTMLInputElement>("input")
const panelId = useId()

// The panel opens on focus and on input. The focus alone is not the rule: a click on a row moves
// the focus out of the input before the link opens.
const open = ref(false)
const showPanel = computed(() => open.value && active.value)

const seeAllPath = computed(() => searchPath(text.value) ?? "/search")
const query = computed(() => text.value.trim())

// The rows that the arrow keys move over: each product, then "See all results".
const rows = computed(() => [
  ...products.value.map((product) => `/products/${product.handle}`),
  seeAllPath.value,
])
const activeIndex = ref(-1)
const optionId = (index: number) => `${panelId}-option-${index}`
const activeDescendant = computed(() =>
  showPanel.value && activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined
)

// A new answer or a new text makes the old active row wrong.
watch([products, text], () => {
  activeIndex.value = -1
})

function close(): void {
  open.value = false
  activeIndex.value = -1
}

onClickOutside(root, close)

// A Tab key out of the box closes the panel.
function onFocusOut(event: FocusEvent): void {
  if (!root.value?.contains(event.relatedTarget as Node | null)) close()
}

function go(path: string): void {
  close()
  void navigateTo(localePath(path))
}

function submit(): void {
  const path = searchPath(text.value)
  if (path) go(path)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    if (showPanel.value) event.preventDefault()
    close()
    input.value?.focus()
    return
  }
  if (!showPanel.value) return
  const count = rows.value.length
  if (event.key === "ArrowDown") {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % count
  } else if (event.key === "ArrowUp") {
    event.preventDefault()
    activeIndex.value = activeIndex.value <= 0 ? count - 1 : activeIndex.value - 1
  } else if (event.key === "Enter" && activeIndex.value >= 0) {
    // The form submit would open the search page. The active row wins.
    event.preventDefault()
    go(rows.value[activeIndex.value]!)
  }
}
</script>

<template>
  <div ref="root" class="relative" @focusout="onFocusOut">
    <form role="search" class="relative" @submit.prevent="submit">
      <Search
        :size="16"
        :stroke-width="1.5"
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref="input"
        v-model="text"
        type="search"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-label="$t('search.label')"
        :placeholder="$t('search.placeholder')"
        :aria-controls="panelId"
        :aria-expanded="showPanel ? 'true' : 'false'"
        :aria-activedescendant="activeDescendant"
        class="h-11 w-48 rounded-none border-0 border-b border-border bg-transparent pr-1 pl-6 text-body-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:shadow-focus"
        @focus="open = true"
        @input="open = true"
        @keydown="onKeydown"
      />
    </form>

    <!-- The mousedown keeps the focus in the input, so a click on a row does not close the panel. -->
    <div
      v-if="showPanel"
      :id="panelId"
      data-testid="search-panel"
      role="listbox"
      :aria-label="$t('search.label')"
      class="absolute top-full right-0 z-50 mt-2 w-[26rem] border border-border bg-background py-3 shadow-md"
      @mousedown.prevent
    >
      <template v-if="pending && products.length === 0">
        <div
          v-for="index in 3"
          :key="index"
          data-slot="skeleton-row"
          aria-hidden="true"
          class="flex items-center gap-4 px-5 py-2"
        >
          <Skeleton class="h-[60px] w-12 shrink-0" />
          <div class="flex flex-1 flex-col gap-2">
            <Skeleton class="h-3 w-3/4" />
            <Skeleton class="h-3 w-1/3" />
          </div>
        </div>
      </template>
      <p v-else-if="products.length === 0" class="px-5 py-2 text-body-sm text-muted-foreground">
        {{ $t("search.noResultsFor", { query }) }}
      </p>
      <NuxtLinkLocale
        v-for="(product, index) in products"
        :id="optionId(index)"
        :key="product.id"
        :to="`/products/${product.handle}`"
        role="option"
        :aria-selected="activeIndex === index ? 'true' : 'false'"
        :class="activeIndex === index ? 'bg-accent' : ''"
        class="flex items-center gap-4 px-5 py-2 text-foreground outline-none hover:bg-accent"
        @click="close"
      >
        <img
          v-if="product.thumbnail"
          :src="product.thumbnail"
          alt=""
          class="h-[60px] w-12 shrink-0 bg-secondary object-cover"
        />
        <span v-else aria-hidden="true" class="h-[60px] w-12 shrink-0 bg-secondary" />
        <span class="flex min-w-0 flex-col gap-1">
          <span class="truncate text-body-sm">{{ product.title }}</span>
          <span class="text-price">{{
            formatPrice(priceView(product.variants ?? []).amount)
          }}</span>
        </span>
      </NuxtLinkLocale>
      <NuxtLinkLocale
        :id="optionId(products.length)"
        :to="seeAllPath"
        role="option"
        :aria-selected="activeIndex === products.length ? 'true' : 'false'"
        :class="activeIndex === products.length ? 'bg-accent' : ''"
        class="mx-2 mt-2 flex min-h-11 items-center px-3 text-body-sm text-foreground underline underline-offset-4 outline-none hover:bg-accent"
        @click="close"
      >
        {{ $t("search.seeAll") }}
      </NuxtLinkLocale>
    </div>
  </div>
</template>
