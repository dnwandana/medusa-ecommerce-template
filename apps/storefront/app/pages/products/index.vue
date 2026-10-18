<script setup lang="ts">
const { t } = useI18n()
// The header loads the same categories, so the page makes no category request of its own.
const { categories } = useNavCategories()

const links = computed(() => topCategoryLinks(categories.value, t("listing.all")))
// The list has no category and no search text.
const scope = {}
const emptyAction = computed(() => ({ label: t("listing.backHome"), to: "/" }))

useHead({ title: () => t("products.title") })
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
