<script setup lang="ts">
import { Heart } from "@lucide/vue"
import { toast } from "vue-sonner"

const props = defineProps<{ variantId: string | null }>()

const route = useRoute()
const localePath = useLocalePath()
const { customer, ensureLoaded } = useCustomer()
const wishlist = useWishlist()
const { t } = useI18n()

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
  // A guest does not call a wishlist route.
  if (!customer.value) {
    await navigateTo({ path: localePath("/account/login"), query: { redirect: route.fullPath } })
    return
  }
  if (props.variantId === null) {
    toast.error(t("products.selectVariant"))
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
    toast.error(t("wishlist.error"))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="lg"
    class="w-full"
    :disabled="busy"
    :aria-pressed="item ? 'true' : 'false'"
    @click="toggle"
  >
    <Heart aria-hidden="true" :class="item ? 'fill-current text-sale' : ''" />
    {{ item ? $t("wishlist.remove") : $t("wishlist.add") }}
  </Button>
</template>
