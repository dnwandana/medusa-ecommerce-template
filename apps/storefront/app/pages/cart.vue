<script setup lang="ts">
import { ChevronLeft, ShoppingBag } from "@lucide/vue"
import type { HttpTypes } from "@medusajs/types"
import type { VariantStock } from "~/composables/useCatalog"
import { latestLineProductId, type RelatedSource } from "~/composables/useRelatedProducts"

type BusyKind = "update" | "remove"

const { t } = useI18n()
const { cart, itemCount, load, updateItem, removeItem } = useCart()
const { customer, ensureLoaded } = useCustomer()
const { listVariantStock } = useCatalog()
const { move } = useMoveToWishlist()

const ready = ref(false)
const failed = ref(false)
const busyLine = ref<{ id: string; kind: BusyKind } | null>(null)
const stock = ref<Record<string, VariantStock>>({})

const lines = computed(() => cart.value?.items ?? [])
const changing = computed(() => busyLine.value !== null)

// The distinct products of the lines, in the order of the lines.
const productIds = computed(() => [
  ...new Set(lines.value.flatMap((item) => (item.product_id ? [item.product_id] : []))),
])

const relatedSource = computed<RelatedSource | null>(() => {
  const productId = latestLineProductId(lines.value)
  return productId ? { productId, excludeIds: productIds.value } : null
})

// Runs one change of the cart at a time. A click during a change does nothing, so two changes
// never run at the same time.
async function change(id: string, kind: BusyKind, action: () => Promise<unknown>): Promise<void> {
  if (busyLine.value) {
    return
  }
  busyLine.value = { id, kind }
  failed.value = false
  try {
    await action()
  } catch {
    failed.value = true
  } finally {
    busyLine.value = null
  }
}

// "signIn" opens the sign-in page, so the page does nothing with the result.
function moveToWishlist(item: HttpTypes.StoreCartLineItem): Promise<void> {
  return change(item.id, "remove", () => move(item))
}

// The cart route does not return the stock. The key is the sorted set of products, so a change
// of a quantity does not read the stock again.
const stockKey = computed(() => [...productIds.value].sort().join(" "))
let stockRequest = 0
watch(
  stockKey,
  async (key) => {
    if (!import.meta.client) {
      return
    }
    const request = ++stockRequest
    let result: Record<string, VariantStock> = {}
    if (key) {
      try {
        result = await listVariantStock(key.split(" "))
      } catch {
        // The lines get no stock limit. The backend still refuses a quantity above the stock.
      }
    }
    // An older request does not overwrite the stock of a newer set of products.
    if (request === stockRequest) {
      stock.value = result
    }
  },
  { immediate: true }
)

// The cart cookie and the session cookie are in the browser. Load the cart after the mount.
onMounted(async () => {
  // The customer only selects the empty text. A failed request keeps the text for a guest.
  ensureLoaded().catch(() => {})
  try {
    await load()
  } catch {
    failed.value = true
  }
  ready.value = true
})

// The route rules also send X-Robots-Tag: noindex. The meta tag keeps the rule in the HTML.
useSeoMeta({ robots: "noindex" })
useHead({ title: () => t("cart.title") })
</script>

<template>
  <div data-testid="cart-page" class="flex flex-col pb-32">
    <!-- Below 768 px the checkout bar of CartSummary is fixed at the bottom of the screen. The
    bottom padding of the page keeps the last content above it. -->
    <header class="flex flex-wrap items-baseline gap-x-3 pt-8 pb-6 md:gap-x-4 md:pt-16 md:pb-10">
      <h1 class="text-h1">{{ $t("cart.title") }}</h1>
      <p v-if="ready && lines.length" class="text-body-sm text-muted-foreground tabular-nums">
        {{ $t("cart.pieces", { count: itemCount }, itemCount) }}
      </p>
      <Skeleton v-else-if="!ready" class="h-3.5 w-16" />
    </header>

    <div
      v-if="!ready"
      data-testid="cart-loading"
      role="status"
      class="grid gap-y-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12"
    >
      <span class="sr-only">{{ $t("common.loading") }}</span>
      <div aria-hidden="true">
        <div
          v-for="index in 3"
          :key="index"
          class="grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 border-b border-border py-6 md:grid-cols-[128px_minmax(0,1fr)_auto] md:gap-x-8 md:border-t md:border-b-0 md:py-8"
        >
          <Skeleton class="aspect-[4/5]" />
          <div class="flex flex-col gap-2">
            <Skeleton class="h-3.5 w-1/2" />
            <Skeleton class="h-3.5 w-1/3" />
            <Skeleton class="mt-auto h-10 w-28" />
          </div>
          <Skeleton class="hidden h-3.5 w-22 md:block" />
        </div>
      </div>
      <div aria-hidden="true" class="flex flex-col gap-4 bg-card px-5 py-6 md:gap-6 md:p-8">
        <Skeleton class="h-7 w-3/5" />
        <Skeleton class="h-3.5" />
        <Skeleton class="h-3.5 w-4/5" />
        <Skeleton class="h-7" />
        <Skeleton class="hidden h-14 md:block" />
      </div>
    </div>

    <template v-else>
      <Alert v-if="failed" variant="destructive" class="mb-6">
        <AlertDescription>{{ $t("common.error") }}</AlertDescription>
      </Alert>

      <Empty v-if="!lines.length" class="border-t border-border">
        <EmptyHeader>
          <EmptyMedia shape="circle">
            <ShoppingBag class="size-6" :stroke-width="1.5" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{{ $t("cart.empty") }}</EmptyTitle>
          <EmptyDescription>
            {{ customer ? $t("cart.emptyBodyWishlist") : $t("cart.emptyBody") }}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" class="w-full md:w-auto" as-child>
            <NuxtLinkLocale to="/products">{{ $t("cart.discover") }}</NuxtLinkLocale>
          </Button>
        </EmptyContent>
      </Empty>

      <template v-else>
        <div class="grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div class="flex min-w-0 flex-col">
            <ul :aria-label="$t('cart.items')">
              <li v-for="item in lines" :key="item.id">
                <CartLineItem
                  :item="item"
                  :stock="(item.variant_id && stock[item.variant_id]) || null"
                  :busy="busyLine?.id === item.id ? busyLine.kind : null"
                  :disabled="changing"
                  @update="
                    (quantity) => change(item.id, 'update', () => updateItem(item.id, quantity))
                  "
                  @remove="change(item.id, 'remove', () => removeItem(item.id))"
                  @move="moveToWishlist(item)"
                />
              </li>
            </ul>
            <div class="pt-6 md:border-t md:border-border">
              <NuxtLinkLocale
                to="/products"
                data-testid="continue"
                class="inline-flex min-h-11 items-center gap-2 text-body-sm underline underline-offset-4 hover:text-muted-foreground"
              >
                <ChevronLeft class="size-4" :stroke-width="1.5" aria-hidden="true" />
                {{ $t("cart.continue") }}
              </NuxtLinkLocale>
            </div>
          </div>

          <CartSummary
            :cart="cart!"
            :disabled="changing"
            class="mt-8 lg:sticky lg:top-24 lg:mt-0 lg:self-start"
          />
        </div>

        <RelatedProducts source-key="cart" :source="relatedSource" class="pt-16 md:pt-32" />
      </template>
    </template>
  </div>
</template>
