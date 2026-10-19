<script setup lang="ts">
const { t } = useI18n()
const { brand } = useAppConfig()
// The header loads the same categories, so the page makes no category request of its own.
const { categories } = useNavCategories()

const links = computed(() => topCategoryLinks(categories.value, t("listing.all")))
// The list has no category and no search text.
const scope = {}
const emptyAction = computed(() => ({ label: t("listing.backHome"), to: "/" }))

// The page ignores the first-thumbnail event of the listing. A list of all products has no one
// photo that stands for it, so the page keeps the default share image.
usePageSeo(() => ({
  title: t("products.title"),
  description: t("seo.productsDescription", { store: brand.name }),
}))
</script>

<template>
  <div class="pt-6 pb-16 md:pt-12 md:pb-32">
    <header
      class="flex flex-col gap-6 pb-6 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-x-12 md:pb-10"
    >
      <h1 class="text-h1">{{ $t("products.title") }}</h1>
      <CategoryFilter :links="links" />
    </header>

    <CatalogListing
      :scope="scope"
      :empty-text="$t('products.empty')"
      :empty-body="$t('listing.productsEmptyBody')"
      :empty-action="emptyAction"
      :categories="links"
    />
  </div>
</template>
