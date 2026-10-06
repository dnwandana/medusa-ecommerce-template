<script setup lang="ts">
import { Heart, LayoutGrid, LogIn, Menu, Package, UserPen } from "@lucide/vue"

const { locale } = useI18n()
const { customer } = useCustomer()
const catalog = useCatalog()
const route = useRoute()

const open = ref(false)

// A click on a link does not close a reka-ui Sheet. Close it when the route changes.
watch(() => route.fullPath, () => {
  open.value = false
})

// The key is the same as on the products page and in the footer, so they share one request.
const { data: categories } = useAsyncData(
  () => `categories:${locale.value}`,
  () => catalog.listCategories()
)

const accountLinks = [
  { to: "/account", icon: UserPen, label: "nav.account" },
  { to: "/account/orders", icon: Package, label: "account.orders" },
  { to: "/account/wishlist", icon: Heart, label: "account.wishlist" },
]
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="$t('nav.menu')">
        <Menu aria-hidden="true" />
      </Button>
    </SheetTrigger>
    <SheetContent
      side="right"
      class="w-[min(320px,100vw)] overflow-y-auto"
      :aria-describedby="undefined"
      :close-label="$t('common.close')"
    >
      <SheetHeader>
        <SheetTitle>{{ $t("nav.menu") }}</SheetTitle>
      </SheetHeader>
      <nav :aria-label="$t('nav.menu')" class="flex flex-col gap-1 px-4 pb-6">
        <Button as-child variant="ghost" class="w-full justify-start">
          <NuxtLinkLocale to="/products">
            <LayoutGrid aria-hidden="true" />
            {{ $t("nav.products") }}
          </NuxtLinkLocale>
        </Button>

        <template v-if="categories?.length">
          <p class="mt-4 px-3 pb-1 text-caption text-muted-foreground">{{ $t("products.categories") }}</p>
          <Button
            v-for="category in categories"
            :key="category.id"
            as-child
            variant="ghost"
            class="w-full justify-start"
          >
            <NuxtLinkLocale :to="`/categories/${category.handle}`">{{ category.name }}</NuxtLinkLocale>
          </Button>
        </template>

        <Separator class="my-4" />

        <template v-if="customer">
          <Button v-for="link in accountLinks" :key="link.to" as-child variant="ghost" class="w-full justify-start">
            <NuxtLinkLocale :to="link.to">
              <component :is="link.icon" aria-hidden="true" />
              {{ $t(link.label) }}
            </NuxtLinkLocale>
          </Button>
        </template>
        <Button v-else as-child variant="ghost" class="w-full justify-start">
          <NuxtLinkLocale to="/account/login">
            <LogIn aria-hidden="true" />
            {{ $t("nav.login") }}
          </NuxtLinkLocale>
        </Button>

        <div class="mt-4">
          <LanguageSwitcher variant="sheet" />
        </div>
      </nav>
    </SheetContent>
  </Sheet>
</template>
