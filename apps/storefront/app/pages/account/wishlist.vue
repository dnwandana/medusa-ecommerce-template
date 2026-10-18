<script setup lang="ts">
import { CircleAlert, Heart, ImageOff } from "@lucide/vue"
import type { WishlistItem } from "~/composables/useWishlist"

definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const { wishlist, load, remove } = useWishlist()

const ready = ref(false)
const busy = ref(false)
const failed = ref(false)
const loadFailed = ref(false)

const items = computed(() => wishlist.value?.items ?? [])

// A variant with no price shows no price text, so the card never shows "Rp NaN".
function priceOf(item: WishlistItem): number | null {
  const amount = item.product_variant.calculated_price?.calculated_amount
  return typeof amount === "number" ? amount : null
}

// Removes one item and shows an error if the removal fails.
async function removeItem(itemId: string): Promise<void> {
  if (busy.value) {
    return
  }
  busy.value = true
  failed.value = false
  try {
    await remove(itemId)
  } catch {
    // remove of useWishlist changes the state only after a success. The item stays on the page.
    failed.value = true
  } finally {
    busy.value = false
  }
}

// The session cookie is in the browser. Load the wishlist after the mount.
async function loadList(): Promise<void> {
  ready.value = false
  loadFailed.value = false
  try {
    await load()
  } catch {
    // load of useWishlist throws for each error that is not a 401 response.
    loadFailed.value = true
  }
  ready.value = true
}

onMounted(loadList)

useHead({ title: () => t("wishlist.title") })
</script>

<template>
  <AccountNav>
    <section aria-labelledby="wishlist-title" class="flex flex-col gap-8">
      <div class="border-b border-border pb-4">
        <h2 id="wishlist-title" class="text-h3 font-normal">{{ $t("wishlist.title") }}</h2>
      </div>

      <div v-if="!ready" role="status" class="grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3">
        <span class="sr-only">{{ $t("common.loading") }}</span>
        <div
          v-for="index in 6"
          :key="index"
          aria-hidden="true"
          data-testid="wishlist-skeleton"
          class="flex flex-col gap-4"
        >
          <Skeleton class="w-full" style="aspect-ratio: 4 / 5" />
          <div class="flex flex-col gap-2">
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-1/3" />
          </div>
        </div>
      </div>

      <template v-else>
        <Alert v-if="loadFailed" variant="destructive">
          <CircleAlert :stroke-width="1.5" aria-hidden="true" />
          <AlertDescription>{{ $t("common.error") }}</AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" size="sm" @click="loadList">
              {{ $t("common.retry") }}
            </Button>
          </AlertAction>
        </Alert>

        <template v-else>
          <Alert v-if="failed" variant="destructive">
            <CircleAlert :stroke-width="1.5" aria-hidden="true" />
            <AlertDescription>{{ $t("wishlist.error") }}</AlertDescription>
          </Alert>

          <Empty v-if="items.length === 0">
            <EmptyHeader>
              <EmptyMedia class="mb-2">
                <Heart :size="28" :stroke-width="1.5" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{{ $t("wishlist.empty") }}</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" as-child>
                <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
              </Button>
            </EmptyContent>
          </Empty>

          <div
            v-else
            class="grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-3 md:gap-x-8 md:gap-y-12"
          >
            <article
              v-for="item in items"
              :key="item.id"
              :data-testid="`wishlist-${item.id}`"
              class="flex min-w-0 flex-col gap-3 md:gap-4"
            >
              <div class="relative">
                <!-- The title link names the product. The photo link repeats it, so the screen
                     reader and the Tab key skip the photo. -->
                <NuxtLinkLocale
                  :to="`/products/${item.product_variant.product.handle}`"
                  tabindex="-1"
                  aria-hidden="true"
                  class="group block overflow-hidden bg-backdrop-sand"
                  style="aspect-ratio: 4 / 5"
                >
                  <img
                    v-if="item.product_variant.product.thumbnail"
                    :src="item.product_variant.product.thumbnail"
                    alt=""
                    loading="lazy"
                    class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                  />
                  <div v-else class="flex size-full items-center justify-center">
                    <ImageOff class="size-8 text-icon-subtle" :stroke-width="1.5" />
                  </div>
                </NuxtLinkLocale>
                <!-- The heart removes this saved variant, not the first variant of the product. -->
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="absolute top-0.5 right-0.5 hover:bg-transparent md:top-2 md:right-2"
                  aria-pressed="true"
                  :data-testid="`remove-${item.id}`"
                  :disabled="busy"
                  @click="removeItem(item.id)"
                >
                  <Heart aria-hidden="true" class="size-5 fill-current" :stroke-width="1.5" />
                  <span class="sr-only">{{ $t("wishlist.remove") }}</span>
                </Button>
              </div>

              <div class="flex flex-col gap-1">
                <h3 class="text-body-sm">
                  <NuxtLinkLocale
                    :to="`/products/${item.product_variant.product.handle}`"
                    class="underline-offset-4 outline-none hover:underline focus-visible:shadow-[var(--focus-ring)]"
                  >
                    {{ item.product_variant.product.title }}
                  </NuxtLinkLocale>
                </h3>
                <p class="text-caption text-muted-foreground">{{ item.product_variant.title }}</p>
                <p v-if="priceOf(item) !== null" class="text-price">
                  {{ formatPrice(priceOf(item)) }}
                </p>
                <NuxtLinkLocale
                  :to="`/products/${item.product_variant.product.handle}`"
                  :data-testid="`view-${item.id}`"
                  class="mt-2 inline-flex min-h-11 items-center self-start text-body-sm text-foreground underline underline-offset-4 outline-none hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)]"
                >
                  {{ $t("wishlist.viewProduct") }}
                </NuxtLinkLocale>
              </div>
            </article>
          </div>
        </template>
      </template>
    </section>
  </AccountNav>
</template>
