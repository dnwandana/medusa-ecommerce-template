<script setup lang="ts">
const props = defineProps<{ variantId: string | null }>()

const route = useRoute()
const localePath = useLocalePath()
const { customer, ensureLoaded } = useCustomer()
const wishlist = useWishlist()

const message = ref<string | null>(null)
const busy = ref(false)
const item = computed(() => (props.variantId ? wishlist.itemFor(props.variantId) : undefined))

// The session cookie is only available in the browser. Load the login state after hydration.
onMounted(async () => {
  try {
    await ensureLoaded()
    if (customer.value && wishlist.wishlist.value === null) {
      await wishlist.load()
    }
  } catch {
    // The button still works. A click shows the error of the request.
  }
})

async function toggle(): Promise<void> {
  message.value = null
  // A guest does not call a wishlist route.
  if (!customer.value) {
    await navigateTo({ path: localePath("/account/login"), query: { redirect: route.fullPath } })
    return
  }
  if (props.variantId === null) {
    message.value = "products.selectVariant"
    return
  }
  busy.value = true
  try {
    if (item.value) {
      await wishlist.remove(item.value.id)
    } else {
      await wishlist.add(props.variantId)
    }
  } catch {
    message.value = "wishlist.error"
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <Button
      type="button"
      variant="outline"
      :disabled="busy"
      :aria-pressed="item ? 'true' : 'false'"
      @click="toggle"
    >
      {{ item ? $t("wishlist.remove") : $t("wishlist.add") }}
    </Button>
    <p v-if="message" role="status" class="text-sm text-neutral-600">{{ $t(message) }}</p>
  </div>
</template>
