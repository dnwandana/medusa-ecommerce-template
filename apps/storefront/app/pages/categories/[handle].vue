<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const catalog = useCatalog()

const handle = computed(() => String(route.params.handle))
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page ?? "1"), 10) || 1))

const { data: category } = await useAsyncData(
  () => `category:${locale.value}:${handle.value}`,
  () => catalog.getCategoryByHandle(handle.value)
)

if (!category.value) {
  throw createError({ statusCode: 404, statusMessage: t("categories.notFound"), fatal: true })
}

// The server render has the status "success". The status is "pending" only while a page change on the client loads.
const { data, error, status } = await useAsyncData(
  () => `category-products:${locale.value}:${handle.value}:${page.value}`,
  () =>
    catalog.listProducts({
      categoryId: category.value!.id,
      offset: (page.value - 1) * PAGE_SIZE,
    })
)

// The key is the same as on the products page, so the pages, the footer, and the mobile menu share one request.
const { data: categories } = await useAsyncData(
  () => `categories:${locale.value}`,
  () => catalog.listCategories()
)

useHead({ title: () => category.value?.name ?? "" })
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-8">
    <Breadcrumb :aria-label="$t('nav.breadcrumb')">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <NuxtLinkLocale to="/">{{ $t("nav.home") }}</NuxtLinkLocale>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <NuxtLinkLocale to="/products">{{ $t("nav.products") }}</NuxtLinkLocale>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{{ category?.name }}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <div class="flex flex-col gap-2">
      <h1 class="text-h1">{{ category?.name }}</h1>
      <p v-if="category?.description" class="text-body-lg max-w-[60ch] text-muted-foreground">
        {{ category.description }}
      </p>
    </div>

    <CategoryFilter v-if="categories?.length" :categories="categories" :current-handle="handle" />
    <ProductGrid
      :products="data?.products ?? []"
      :empty-text="$t('categories.empty')"
      :loading="status === 'pending'"
      :error="!!error"
    />
    <CatalogPagination :page="page" :count="data?.count ?? 0" :path="`/categories/${handle}`" />
  </div>
</template>
