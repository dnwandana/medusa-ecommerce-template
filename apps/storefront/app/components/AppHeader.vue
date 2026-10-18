<script setup lang="ts">
import { Heart, Search, ShoppingBag } from "@lucide/vue"
import { useEventListener } from "@vueuse/core"

// The header gets the shadow after this scroll distance.
const SHADOW_SCROLL_PX = 40

// The layout loads the cart and the customer. The header only reads them.
const { itemCount } = useCart()
const { customer } = useCustomer()
const { wishlist, load } = useWishlist()
const { categories } = useNavCategories()

const wishlistCount = computed(() => wishlist.value?.items.length ?? 0)

const scrolled = ref(false)
const searchOpen = ref(false)

// The listener starts after the mount, so the server render has no shadow.
onMounted(() => {
  const update = () => {
    scrolled.value = window.scrollY > SHADOW_SCROLL_PX
  }
  update()
  useEventListener(window, "scroll", update, { passive: true })
})

// A guest has no wishlist, so the header asks for it only after the sign-in.
if (import.meta.client) {
  watch(
    () => customer.value?.id,
    (id) => {
      // The count is not important enough to break the header.
      if (id) load().catch(() => {})
    },
    { immediate: true }
  )
}
</script>

<template>
  <header
    :data-scrolled="scrolled ? 'true' : undefined"
    :class="scrolled ? 'shadow-md' : ''"
    class="sticky top-0 z-40 border-b border-border bg-background transition-shadow duration-250"
  >
    <div
      class="mx-auto grid h-[60px] max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-12 lg:h-20"
    >
      <div class="flex items-center justify-self-start">
        <div class="-ml-3 lg:hidden">
          <AppMobileMenu />
        </div>
        <nav :aria-label="$t('nav.categories')" class="hidden items-center gap-8 lg:flex">
          <NuxtLinkLocale
            v-for="category in categories"
            :key="category.id"
            :to="`/categories/${category.handle}`"
            class="inline-flex min-h-11 items-center text-nav text-foreground outline-none hover:underline hover:underline-offset-4 focus-visible:shadow-focus"
          >
            {{ category.name }}
          </NuxtLinkLocale>
        </nav>
      </div>

      <AppWordmark />

      <div class="-mr-3 flex items-center justify-self-end lg:gap-1">
        <IconCountButton
          data-slot="search"
          :label="$t('nav.search')"
          aria-haspopup="dialog"
          :aria-expanded="searchOpen ? 'true' : 'false'"
          class="lg:hidden"
          @click="searchOpen = true"
        >
          <Search :stroke-width="1.5" aria-hidden="true" />
        </IconCountButton>
        <SearchSheet v-model:open="searchOpen" />
        <div class="hidden items-center gap-1 lg:flex">
          <SearchBox class="mr-4" />
          <LanguageSwitcher />
          <AccountMenu />
          <IconCountButton
            to="/account/wishlist"
            :label="$t('nav.wishlistLabel', wishlistCount)"
            :count="wishlistCount"
          >
            <Heart :stroke-width="1.5" aria-hidden="true" />
          </IconCountButton>
        </div>
        <IconCountButton to="/cart" :label="$t('nav.cartLabel', itemCount)" :count="itemCount">
          <ShoppingBag :stroke-width="1.5" aria-hidden="true" />
        </IconCountButton>
      </div>
    </div>
  </header>
</template>
