<script setup lang="ts">
import { Search, X } from "@lucide/vue"

const open = defineModel<boolean>("open", { default: false })

const localePath = useLocalePath()
const route = useRoute()

// The text lives here and not in the sheet content, so it stays when the sheet closes.
const text = ref("")
const { products, pending, active } = useSearchSuggestions(text)

const input = useTemplateRef<HTMLInputElement>("input")
const query = computed(() => text.value.trim())
const seeAllPath = computed(() => searchPath(text.value) ?? "/search")

// A click on a link does not close a reka-ui Sheet. Close it when the route changes.
watch(
  () => route.fullPath,
  () => {
    open.value = false
  }
)

// reka-ui puts the focus on the first focusable element. The input must get it.
function onOpenAutoFocus(event: Event): void {
  event.preventDefault()
  input.value?.focus()
}

function close(): void {
  open.value = false
}

function submit(): void {
  const path = searchPath(text.value)
  if (!path) return
  close()
  void navigateTo(localePath(path))
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="top"
      class="h-dvh max-h-none w-full gap-0 overflow-y-auto data-[side=top]:h-dvh"
      :show-close-button="false"
      :aria-describedby="undefined"
      @open-auto-focus="onOpenAutoFocus"
    >
      <SheetTitle class="sr-only">{{ $t("search.title") }}</SheetTitle>
      <div class="flex items-center gap-2 border-b border-border pr-1 pl-4">
        <form role="search" class="relative flex-1" @submit.prevent="submit">
          <Search
            :size="20"
            :stroke-width="1.5"
            aria-hidden="true"
            class="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-muted-foreground"
          />
          <!-- The text is 16 px, so a phone does not zoom the page on focus. -->
          <input
            ref="input"
            v-model="text"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            :aria-label="$t('search.label')"
            :placeholder="$t('search.placeholder')"
            class="h-14 w-full rounded-none border-0 bg-transparent pr-2 pl-8 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:shadow-focus"
          />
        </form>
        <SheetClose as-child>
          <button
            type="button"
            :aria-label="$t('search.close')"
            class="inline-flex size-11 shrink-0 items-center justify-center text-foreground outline-none hover:bg-accent focus-visible:shadow-focus"
          >
            <X :size="20" :stroke-width="1.5" aria-hidden="true" />
          </button>
        </SheetClose>
      </div>

      <div v-if="active" class="flex flex-col py-3">
        <template v-if="pending && products.length === 0">
          <div
            v-for="index in 3"
            :key="index"
            aria-hidden="true"
            class="flex min-h-14 items-center gap-4 px-4 py-2"
          >
            <Skeleton class="h-[60px] w-12 shrink-0" />
            <div class="flex flex-1 flex-col gap-2">
              <Skeleton class="h-3 w-3/4" />
              <Skeleton class="h-3 w-1/3" />
            </div>
          </div>
        </template>
        <p v-else-if="products.length === 0" class="px-4 py-2 text-body-sm text-muted-foreground">
          {{ $t("search.noResultsFor", { query }) }}
        </p>
        <NuxtLinkLocale
          v-for="product in products"
          :key="product.id"
          :to="`/products/${product.handle}`"
          class="flex min-h-14 items-center gap-4 px-4 py-2 text-foreground outline-none hover:bg-accent focus-visible:shadow-focus"
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
          :to="seeAllPath"
          class="mx-1 mt-2 flex min-h-11 items-center self-start px-3 text-body-sm text-foreground underline underline-offset-4 outline-none hover:bg-accent focus-visible:shadow-focus"
          @click="close"
        >
          {{ $t("search.seeAll") }}
        </NuxtLinkLocale>
      </div>
    </SheetContent>
  </Sheet>
</template>
