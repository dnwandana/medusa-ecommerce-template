<script setup lang="ts">
import type { ReviewPage } from "~/composables/useReviews"
import { galleryImages } from "~/utils/galleryImages"
import { productBadge } from "~/utils/productBadges"

const { locale, t } = useI18n()
const route = useRoute()
const catalog = useCatalog()
const storefront = useStorefront()

const handle = computed(() => String(route.params.handle))

// ProductPurchase and the badge read the settings, so the page loads them with the product.
const [{ data: product }] = await Promise.all([
  useAsyncData(
    () => `product:${locale.value}:${handle.value}`,
    () => catalog.getProductByHandle(handle.value)
  ),
  useAsyncData("storefront-settings", () => storefront.ensureSettings()),
])

if (!product.value) {
  throw createError({ statusCode: 404, data: { messageKey: "products.notFound" }, fatal: true })
}

useHead({ title: () => product.value?.title ?? "" })

// The breadcrumbs name the first category of the product and its parent.
const category = computed(() => product.value?.categories?.[0] ?? null)
const parentCategory = computed(() => category.value?.parent_category ?? null)

// ProductPurchase sets the colour. Until then, the gallery shows the colour of the first variant,
// which ProductPurchase selects at the start.
const colour = ref<string | null>(null)
const images = computed(() => (product.value ? galleryImages(product.value, colour.value) : []))
const badgeLabel = computed(() => {
  const badge = product.value ? productBadge(product.value, storefront.settings.value) : null
  return badge ? t(`products.badges.${badge}`) : null
})

const gallery = useTemplateRef<{ focusPhoto(index: number): void }>("gallery")
const viewerOpen = ref(false)
const viewerStart = ref(0)

function openViewer(index: number): void {
  viewerStart.value = index
  viewerOpen.value = true
}

// ReviewList loads the first review page with this key, so the rating link sends no request.
const reviewKey = computed(() => `reviews:${product.value?.id}`)
const { data: reviewPage } = useNuxtData<ReviewPage>(reviewKey.value)

const relatedSource = computed(() =>
  product.value
    ? { productId: product.value.id, categories: product.value.categories ?? [], excludeIds: [] }
    : null
)
</script>

<template>
  <div v-if="product" class="flex flex-col pb-24 md:pb-32">
    <Breadcrumb :aria-label="$t('nav.breadcrumb')" class="pt-6 pb-6 md:pb-8">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink as-child>
            <NuxtLinkLocale to="/">{{ $t("nav.home") }}</NuxtLinkLocale>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <template v-if="category">
          <template v-if="parentCategory">
            <BreadcrumbItem>
              <BreadcrumbLink as-child>
                <NuxtLinkLocale :to="`/categories/${parentCategory.handle}`">{{
                  parentCategory.name
                }}</NuxtLinkLocale>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </template>
          <BreadcrumbItem>
            <BreadcrumbLink as-child>
              <NuxtLinkLocale :to="`/categories/${category.handle}`">{{
                category.name
              }}</NuxtLinkLocale>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </template>
        <BreadcrumbItem v-else>
          <BreadcrumbLink as-child>
            <NuxtLinkLocale to="/products">{{ $t("nav.products") }}</NuxtLinkLocale>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{{ product.title }}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>

    <div class="grid lg:grid-cols-11 lg:gap-12">
      <ProductGallery
        ref="gallery"
        class="lg:col-span-7"
        :images="images"
        :title="product.title"
        :badge-label="badgeLabel"
        @open="openViewer"
      />

      <!-- The detail column stays in view while the photos scroll, from 1024 px only. -->
      <div
        data-testid="product-detail"
        class="flex flex-col gap-7 pt-6 md:gap-8 lg:sticky lg:top-24 lg:col-span-4 lg:self-start lg:pt-2"
      >
        <h1 class="text-h1">{{ product.title }}</h1>
        <a
          v-if="reviewPage && reviewPage.count > 0"
          href="#reviews"
          class="-mt-4 self-start underline-offset-4 hover:underline md:-mt-5"
        >
          <StarRating
            :rating="reviewPage.average_rating ?? 0"
            :count="reviewPage.count"
            show-value
            size="sm"
          />
        </a>
        <ProductPurchase :product="product" @colour-change="colour = $event">
          <p
            v-if="product.description"
            class="max-w-[560px] text-body whitespace-pre-line text-muted-foreground"
          >
            {{ product.description }}
          </p>
        </ProductPurchase>
        <ProductDetails :product="product" />
      </div>
    </div>

    <PhotoViewer
      v-model:open="viewerOpen"
      :images="images"
      :title="product.title"
      :start-index="viewerStart"
      @closed="gallery?.focusPhoto($event)"
    />

    <RelatedProducts :source-key="product.id" :source="relatedSource" class="pt-16 md:pt-32" />

    <ReviewList :product-id="product.id" class="pt-16 md:pt-32" />
  </div>
</template>
