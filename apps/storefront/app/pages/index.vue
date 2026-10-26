<script setup lang="ts">
import { absoluteUrl } from "~/utils/seoText"
import { onlineStoreJsonLd, websiteJsonLd } from "~/utils/structuredData"

const { t, locale, localeProperties } = useI18n()
const localePath = useLocalePath()
const catalog = useCatalog()
const storefront = useStorefront()
const { brand } = useAppConfig()
const siteUrl = useSiteUrl()
// The footer loads the same categories, so the tiles make no request of their own.
const { categories } = useHomeCategories()

// Each request catches its own failure. A failed campaign shows the text hero, and failed
// products show the error state of the grid, while the other part still shows.
const [{ data, status, refresh }, { data: contact }] = await Promise.all([
  useAsyncData(
    () => `home:${locale.value}`,
    async () => {
      const [campaign, newIn] = await Promise.all([
        storefront.getHomeCampaign().catch(() => null),
        catalog.listProducts({ limit: 4 }).catch(() => null),
      ])
      return { campaign, products: newIn?.products ?? null }
    }
  ),
  // The OnlineStore node shows the store contact. The contact page uses the same key and the same
  // handler, so the two pages share the data. A failed request leaves data empty, and the node
  // then has no contact keys.
  useAsyncData("store-contact", async () => (await storefront.ensureSettings()).contact),
])

const loading = computed(() => status.value === "pending")
const productsFailed = computed(() => !loading.value && !data.value?.products)

usePageSeo(() => ({
  home: true,
  title: t("home.title"),
  description: t("home.subtitle"),
  jsonLd: [
    onlineStoreJsonLd({
      name: brand.name,
      siteUrl,
      returnsUrl: absoluteUrl(localePath("/returns"), siteUrl),
      email: contact.value?.email ?? null,
      telephone: contact.value?.phone ?? null,
      address: contact.value?.address ?? null,
      sameAs: (contact.value?.social_links ?? []).map((link) => link.url),
    }),
    // The i18n config sets the language tag ("en-US") of each locale. The locale code is only a
    // fallback.
    websiteJsonLd({
      name: brand.name,
      siteUrl,
      language: localeProperties.value.language ?? locale.value,
    }),
  ],
}))
</script>

<template>
  <div class="pb-16 md:pb-32">
    <HomeHero :campaign="data?.campaign ?? null" />

    <section aria-labelledby="new-in-title" data-testid="new-in" class="pt-16 md:pt-24">
      <div class="mb-6 flex items-end justify-between gap-6 md:mb-12">
        <div class="flex flex-col gap-3">
          <p class="text-eyebrow text-muted-foreground">{{ $t("home.newInEyebrow") }}</p>
          <h2 id="new-in-title" class="text-h2">{{ $t("home.newProducts") }}</h2>
        </div>
        <NuxtLinkLocale
          to="/products"
          class="inline-flex min-h-11 shrink-0 items-center text-body-sm text-foreground underline decoration-1 underline-offset-4 outline-none hover:text-muted-foreground focus-visible:shadow-focus"
        >
          {{ $t("home.newInViewAll") }}
        </NuxtLinkLocale>
      </div>
      <ProductGrid
        :products="data?.products ?? []"
        :empty-text="$t('products.empty')"
        :loading="loading"
        :error="productsFailed"
        :skeletons="4"
        @retry="refresh()"
      />
    </section>

    <HomeCategoryTiles :categories="categories" class="pt-16 md:pt-24" />

    <ServiceRow class="pt-16 md:pt-24" />
  </div>
</template>
