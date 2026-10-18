<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const catalog = useCatalog()

const handle = computed(() => String(route.params.handle))

const { data: category } = await useAsyncData(
  () => `category:${locale.value}:${handle.value}`,
  () => catalog.getCategoryByHandle(handle.value)
)

if (!category.value) {
  throw createError({ statusCode: 404, data: { messageKey: "categories.notFound" }, fatal: true })
}

// Only the direct parent shows in the breadcrumbs.
const parent = computed(() => category.value?.parent_category ?? null)
const links = computed(() =>
  category.value ? childCategoryLinks(category.value, t("listing.all")) : []
)
// The page lists the products of the category and of all the categories below it.
const scope = computed(() => ({
  categoryId: category.value!.id,
  descendantIds: descendantCategoryIds(category.value!),
}))
const emptyAction = computed(() => ({ label: t("home.viewAll"), to: "/products" }))

useHead({ title: () => category.value?.name ?? "" })
</script>

<template>
  <div v-if="category" class="pb-16 md:pb-32">
    <Breadcrumb :aria-label="$t('nav.breadcrumb')" class="pt-4 pb-6 md:pt-6 md:pb-10">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <NuxtLinkLocale to="/">{{ $t("nav.home") }}</NuxtLinkLocale>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <template v-if="parent">
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink as-child>
              <NuxtLinkLocale :to="`/categories/${parent.handle}`">{{
                parent.name
              }}</NuxtLinkLocale>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </template>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{{ category.name }}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <header
      class="flex flex-col gap-6 pb-6 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-x-12 md:pb-10"
    >
      <div class="flex max-w-[560px] flex-col gap-3">
        <h1 class="text-h1">{{ category.name }}</h1>
        <p v-if="category.description" class="text-body text-muted-foreground">
          {{ category.description }}
        </p>
      </div>
      <CategoryFilter :links="links" />
    </header>

    <CatalogListing
      :scope="scope"
      :empty-text="$t('categories.empty')"
      :empty-body="$t('listing.categoryEmptyBody')"
      :empty-action="emptyAction"
      :categories="links"
    />
  </div>
</template>
