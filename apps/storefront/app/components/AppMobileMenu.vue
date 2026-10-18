<script setup lang="ts">
import { ChevronRight, Heart, LogOut, Menu, Package, User } from "@lucide/vue"

const { locale, locales, setLocale, t } = useI18n()
const { customer, logout } = useCustomer()
const { categories } = useNavCategories()
const localePath = useLocalePath()
const route = useRoute()

const open = ref(false)

// A click on a link does not close a reka-ui Sheet. Close it when the route changes.
watch(
  () => route.fullPath,
  () => {
    open.value = false
  }
)

const rows = computed(() => [
  ...categories.value.map((category) => ({
    key: category.id,
    to: `/categories/${category.handle}`,
    label: category.name,
  })),
  { key: "all-products", to: "/products", label: t("nav.allProducts") },
])

const guestLinks = [
  { to: SIGN_IN_PATH, icon: User, label: "nav.signIn" },
  { to: "/account/wishlist", icon: Heart, label: "nav.wishlist" },
]

const accountLinks = [
  { to: "/account", icon: User, label: "nav.account" },
  { to: "/account/orders", icon: Package, label: "nav.orders" },
  { to: "/account/wishlist", icon: Heart, label: "nav.wishlist" },
]

const links = computed(() => (customer.value ? accountLinks : guestLinks))

const languages = computed(() =>
  locales.value.map((item) => ({
    value: item.code,
    label: t(`nav.languageNames.${item.code}`),
  }))
)

// setLocale writes the cookie. The return page from a payment gateway needs the cookie to know the
// language.
const chooseLanguage = (code: string) => setLocale(code as typeof locale.value)

async function leave(): Promise<void> {
  await logout()
  await navigateTo(localePath("/"))
}

const LINK_CLASS =
  "flex min-h-11 items-center gap-3 text-nav text-foreground outline-none hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)]"
</script>

<template>
  <Sheet v-model:open="open">
    <SheetTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="t('nav.menu')">
        <Menu :stroke-width="1.5" aria-hidden="true" />
      </Button>
    </SheetTrigger>
    <SheetContent
      side="left"
      class="gap-0 overflow-y-auto"
      :aria-describedby="undefined"
      :close-label="t('common.close')"
    >
      <SheetHeader
        class="h-15 flex-row items-center justify-start border-b border-border py-0 pr-14 pl-4"
      >
        <SheetTitle class="sr-only">{{ t("nav.menu") }}</SheetTitle>
        <AppWordmark />
      </SheetHeader>

      <nav :aria-label="t('nav.categories')">
        <NuxtLinkLocale
          v-for="row in rows"
          :key="row.key"
          :to="row.to"
          data-slot="category-row"
          class="flex min-h-16 items-center justify-between border-b border-border px-4 font-heading text-[28px] leading-[34px] text-foreground outline-none hover:italic focus-visible:shadow-[var(--focus-ring)]"
        >
          {{ row.label }}
          <ChevronRight :size="20" :stroke-width="1.5" aria-hidden="true" />
        </NuxtLinkLocale>
      </nav>

      <div class="flex flex-col gap-1 px-4 py-6">
        <NuxtLinkLocale v-for="link in links" :key="link.to" :to="link.to" :class="LINK_CLASS">
          <component :is="link.icon" :size="18" :stroke-width="1.5" aria-hidden="true" />
          {{ t(link.label) }}
        </NuxtLinkLocale>
        <button v-if="customer" type="button" :class="LINK_CLASS" @click="leave">
          <LogOut :size="18" :stroke-width="1.5" aria-hidden="true" />
          {{ t("nav.signOut") }}
        </button>
      </div>

      <div class="flex flex-col gap-3 px-4 pb-8">
        <!-- The control has the same aria-label, so a screen reader reads the name once. -->
        <p class="text-field-label" aria-hidden="true">{{ t("nav.language") }}</p>
        <SegmentedControl
          :model-value="locale"
          :options="languages"
          :label="t('nav.language')"
          @update:model-value="chooseLanguage"
        />
      </div>
    </SheetContent>
  </Sheet>
</template>
