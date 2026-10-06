<script setup lang="ts">
const { locale } = useI18n()
const { brand } = useAppConfig()
const catalog = useCatalog()

// The key is the same as on the products page, so the two share one request.
// The footer ignores the error: it then shows no category links, but the Products link stays.
const { data: categories } = await useAsyncData(
  () => `categories:${locale.value}`,
  () => catalog.listCategories()
)
</script>

<template>
  <footer class="border-t border-border bg-card">
    <div class="mx-auto grid max-w-[1280px] gap-8 px-4 py-12 md:grid-cols-[2fr_1fr_1fr] md:px-6">
      <div class="flex flex-col gap-4">
        <p class="text-h4">{{ brand.name }}</p>
        <p class="max-w-sm text-body-sm text-muted-foreground">{{ $t("footer.about") }}</p>
        <TrustLines />
      </div>

      <nav :aria-label="$t('footer.shop')" class="flex flex-col gap-3">
        <h2 class="text-h4">{{ $t("footer.shop") }}</h2>
        <ul class="flex flex-col gap-2 text-body-sm">
          <li>
            <NuxtLinkLocale to="/products" class="text-muted-foreground hover:text-foreground">
              {{ $t("nav.products") }}
            </NuxtLinkLocale>
          </li>
          <li v-for="category in categories ?? []" :key="category.id">
            <NuxtLinkLocale
              :to="`/categories/${category.handle}`"
              class="text-muted-foreground hover:text-foreground"
            >
              {{ category.name }}
            </NuxtLinkLocale>
          </li>
        </ul>
      </nav>

      <nav :aria-label="$t('nav.account')" class="flex flex-col gap-3">
        <h2 class="text-h4">{{ $t("nav.account") }}</h2>
        <ul class="flex flex-col gap-2 text-body-sm">
          <li>
            <NuxtLinkLocale to="/account" class="text-muted-foreground hover:text-foreground">
              {{ $t("account.profile") }}
            </NuxtLinkLocale>
          </li>
          <li>
            <NuxtLinkLocale
              to="/account/orders"
              class="text-muted-foreground hover:text-foreground"
            >
              {{ $t("account.orders") }}
            </NuxtLinkLocale>
          </li>
          <li>
            <NuxtLinkLocale
              to="/account/wishlist"
              class="text-muted-foreground hover:text-foreground"
            >
              {{ $t("account.wishlist") }}
            </NuxtLinkLocale>
          </li>
        </ul>
      </nav>
    </div>

    <div class="border-t border-border">
      <p class="mx-auto max-w-[1280px] px-4 py-6 text-caption text-muted-foreground md:px-6">
        © {{ brand.name }}
      </p>
    </div>
  </footer>
</template>
