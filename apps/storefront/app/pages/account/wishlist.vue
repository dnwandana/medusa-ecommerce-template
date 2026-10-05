<script setup lang="ts">
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
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ $t("wishlist.title") }}</h1>

    <p v-if="!ready">{{ $t("common.loading") }}</p>
    <template v-else>
      <p v-if="loadFailed" role="alert" class="text-destructive">{{ $t("common.error") }}</p>
      <p v-if="failed" role="alert" class="text-destructive">{{ $t("wishlist.error") }}</p>

      <p v-if="!loadFailed && items.length === 0">{{ $t("wishlist.empty") }}</p>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <Card v-for="item in items" :key="item.id" class="flex flex-row items-center gap-4 p-4">
          <img
            v-if="item.product_variant.product.thumbnail"
            :src="item.product_variant.product.thumbnail"
            :alt="item.product_variant.product.title"
            class="size-20 rounded-md object-cover"
          >
          <div class="flex flex-1 flex-col gap-1">
            <p class="font-medium">{{ item.product_variant.product.title }}</p>
            <p class="text-sm text-muted-foreground">{{ item.product_variant.title }}</p>
            <!-- A variant with no price shows no price text. -->
            <p v-if="item.product_variant.calculated_price !== null" class="text-sm">
              {{ formatPrice(item.product_variant.calculated_price.calculated_amount) }}
            </p>
            <div class="flex flex-wrap items-center gap-2">
              <NuxtLinkLocale
                :to="`/products/${item.product_variant.product.handle}`"
                class="text-sm underline underline-offset-4"
              >{{ $t("wishlist.viewProduct") }}</NuxtLinkLocale>
              <Button
                variant="ghost"
                :data-testid="`remove-${item.id}`"
                :disabled="busy"
                @click="removeItem(item.id)"
              >
                {{ $t("wishlist.remove") }}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </template>
  </div>
</template>
