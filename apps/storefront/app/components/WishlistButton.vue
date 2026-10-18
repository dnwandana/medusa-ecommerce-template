<script setup lang="ts">
import { Heart } from "@lucide/vue"
import { toast } from "vue-sonner"
import { signInTarget } from "~/utils/authPaths"

// "square" sits next to "Add to cart". "overlay" sits on the top right of a card photo.
const props = withDefaults(
  defineProps<{ variantId: string | null; look?: "square" | "overlay" }>(),
  { look: "square" }
)

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
    await navigateTo(localePath(signInTarget(route.fullPath)))
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
    :variant="look === 'overlay' ? 'ghost' : 'outline'"
    size="icon"
    :class="look === 'overlay' ? 'hover:bg-transparent' : 'size-14'"
    :disabled="busy"
    :aria-label="item ? $t('wishlist.remove') : $t('wishlist.save')"
    :aria-pressed="item ? 'true' : 'false'"
    :title="customer ? undefined : $t('wishlist.signInToSave')"
    @click="toggle"
  >
    <Heart aria-hidden="true" class="size-5" :class="item ? 'fill-current' : ''" />
  </Button>
</template>
