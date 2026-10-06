<script setup lang="ts">
import { Heart, Trash2 } from "@lucide/vue"

definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const { wishlist, load, remove } = useWishlist()

const ready = ref(false)
const busy = ref(false)
const failed = ref(false)
const loadFailed = ref(false)

const items = computed(() => wishlist.value?.items ?? [])

// Removes one item and shows an error if the removal fails.
async function removeItem(itemId: string): Promise<void> {
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
onMounted(async () => {
  try {
    await load()
  } catch {
    // load of useWishlist throws for each error that is not a 401 response.
    loadFailed.value = true
  }
  ready.value = true
})

useHead({ title: () => t("wishlist.title") })
</script>

<template>
  <AccountNav>
    <section class="flex flex-col gap-6">
      <h2 class="text-h2">{{ $t("wishlist.title") }}</h2>

      <p v-if="!ready" role="status" class="text-muted-foreground">{{ $t("common.loading") }}</p>
      <template v-else>
        <Alert v-if="loadFailed" variant="destructive">
          <AlertDescription>{{ $t("common.error") }}</AlertDescription>
        </Alert>
        <Alert v-if="failed" variant="destructive">
          <AlertDescription>{{ $t("wishlist.error") }}</AlertDescription>
        </Alert>

        <Empty v-if="!loadFailed && items.length === 0" variant="outline">
          <EmptyHeader>
            <EmptyMedia>
              <Heart class="size-6" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{{ $t("wishlist.empty") }}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button as-child>
              <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
            </Button>
          </EmptyContent>
        </Empty>

        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Item v-for="item in items" :key="item.id" variant="outline" class="flex-nowrap">
            <ItemMedia class="w-20 overflow-hidden rounded-sm">
              <AspectRatio :ratio="3 / 4">
                <img
                  v-if="item.product_variant.product.thumbnail"
                  :src="item.product_variant.product.thumbnail"
                  :alt="item.product_variant.product.title"
                  class="size-full object-cover"
                />
                <div v-else class="size-full bg-backdrop-sand" />
              </AspectRatio>
            </ItemMedia>

            <ItemContent>
              <ItemTitle>{{ item.product_variant.product.title }}</ItemTitle>
              <ItemDescription>{{ item.product_variant.title }}</ItemDescription>
              <!-- A variant with no price shows no price text. -->
              <p v-if="item.product_variant.calculated_price !== null" class="text-price">
                {{ formatPrice(item.product_variant.calculated_price.calculated_amount) }}
              </p>
              <Button variant="outline" size="sm" as-child class="mt-1 self-start">
                <NuxtLinkLocale :to="`/products/${item.product_variant.product.handle}`">
                  {{ $t("wishlist.viewProduct") }}
                </NuxtLinkLocale>
              </Button>
            </ItemContent>

            <ItemActions>
              <!-- The sr-only text names the button. The Tooltip only repeats the name. -->
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    :data-testid="`remove-${item.id}`"
                    :disabled="busy"
                    @click="removeItem(item.id)"
                  >
                    <Trash2 aria-hidden="true" />
                    <span class="sr-only">{{ $t("wishlist.remove") }}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{{ $t("wishlist.remove") }}</TooltipContent>
              </Tooltip>
            </ItemActions>
          </Item>
        </div>
      </template>
    </section>
  </AccountNav>
</template>
