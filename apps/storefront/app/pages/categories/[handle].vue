<script setup lang="ts">
import { absoluteUrl } from "~/utils/seoText"
import { breadcrumbJsonLd } from "~/utils/structuredData"

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const catalog = useCatalog()
const { brand } = useAppConfig()
const siteUrl = useSiteUrl()

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

// The listing gives the photo of its first product. With no product, the page uses the default
// share image.
const firstThumbnail = ref<string | null>(null)

usePageSeo(() => {
  const current = category.value
  if (!current) {
    return null
  }
  // The JSON-LD trail is the same as the visible breadcrumbs.
  const trail = [
    { name: t("nav.home"), url: absoluteUrl(localePath("/"), siteUrl) },
    ...(parent.value
      ? [
          {
            name: parent.value.name,
            url: absoluteUrl(localePath(`/categories/${parent.value.handle}`), siteUrl),
          },
        ]
      : []),
    { name: current.name, url: null },
  ]
  return {
    title: current.name,
    description:
      current.description ||
      t("seo.categoryDescription", { category: current.name, store: brand.name }),
    image: firstThumbnail.value ? { url: firstThumbnail.value, alt: current.name } : null,
    jsonLd: [breadcrumbJsonLd(trail)],
  }
})
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
      @first-thumbnail="firstThumbnail = $event"
    />
  </div>
</template>
