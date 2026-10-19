<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { galleryImages } from "~/utils/galleryImages"
import { findColourOption } from "~/utils/optionNames"
import { productBadge } from "~/utils/productBadges"
import { productJsonLd } from "~/utils/productStructuredData"
import { absoluteUrl, productSeoDescription } from "~/utils/seoText"
import { breadcrumbJsonLd } from "~/utils/structuredData"
import { variantFromQuery } from "~/utils/variantSelection"

const { locale, t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalog = useCatalog()
const storefront = useStorefront()
const localePath = useLocalePath()

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

// The breadcrumbs name the first category of the product and its parent. A product with no
// category links to the product list. The template and the JSON-LD use the same trail.
const category = computed(() => product.value?.categories?.[0] ?? null)
const parentCategory = computed(() => category.value?.parent_category ?? null)
const breadcrumbLinks = computed(() => {
  if (!category.value) {
    return [{ name: t("nav.products"), path: "/products" }]
  }
  const parent = parentCategory.value
  return [
    ...(parent ? [{ name: parent.name, path: `/categories/${parent.handle}` }] : []),
    { name: category.value.name, path: `/categories/${category.value.handle}` },
  ]
})

// A valid ?variant= sets the start selection, so the server render shows that variant. The page
// reads the value once: later URL changes come from the selection itself.
const startVariant = variantFromQuery(product.value, route.query.variant)
const currentVariant = computed(() =>
  product.value ? variantFromQuery(product.value, route.query.variant) : null
)

// Returns the colour value of the variant, or null when the product has no colour option.
function colourOf(variant: HttpTypes.StoreProductVariant | null): string | null {
  const option = product.value ? findColourOption(product.value) : null
  if (!option) {
    return null
  }
  return variant?.options?.find((item) => item.option_id === option.id)?.value ?? null
}

// ProductPurchase sets the colour. Until then, the gallery shows the colour of the start variant.
// With no start variant, galleryImages uses the first variant, which ProductPurchase selects.
const colour = ref<string | null>(colourOf(startVariant))
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

// The page waits for the first review page, so the server HTML and the JSON-LD have the rating.
// ReviewList uses the same result. A failed request stays in the error of the key: the page
// renders with no rating.
const { data: reviewPage } = await useFirstReviewPage(product.value.id)

// The URL names the selected variant, so a shared link opens it. replace adds no history entry,
// and the other query parameters stay. The product key has no query, so nothing loads again.
// The new location has no hash. Known edge: when the page opened from a URL with #reviews, the
// first variant change removes the hash, and the Nuxt scrollBehavior then scrolls to the top. To
// keep the hash is not better, because then each variant change scrolls to the reviews.
function onVariantChange(id: string): void {
  router.replace({ query: { ...route.query, variant: id } })
}

// The rating link scrolls to the reviews with no change to the URL. A #reviews hash in the route
// would make the next variant change scroll to the top (see onVariantChange). The href stays for
// a browser with no JavaScript and for "open in a new tab".
function scrollToReviews(event: MouseEvent): void {
  const section = document.getElementById("reviews")
  if (!section || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
    return
  }
  event.preventDefault()
  // scrollIntoView uses the scroll-margin of the section, as the browser does for a hash link.
  section.scrollIntoView({ block: "start" })
  // A hash link also moves the keyboard focus point to the target. The section has tabindex -1,
  // so the next Tab key goes on from the reviews.
  section.focus({ preventScroll: true })
}

const { brand } = useAppConfig()
const siteUrl = useSiteUrl()

// The head names the variant of ?variant= only in the description and the image. The canonical
// URL has no variant, so all variant links point to one page.
usePageSeo(() => {
  if (!product.value) {
    return null
  }
  const canonicalUrl = absoluteUrl(localePath(`/products/${handle.value}`), siteUrl)
  const image = galleryImages(product.value, colourOf(currentVariant.value))[0]
  // The stars in the JSON-LD come from the same review page as the rating link.
  const rating = reviewPage.value
    ? { average: reviewPage.value.average_rating ?? 0, count: reviewPage.value.count }
    : null
  return {
    title: product.value.title,
    description: productSeoDescription({ product: product.value, variant: currentVariant.value }),
    image: image ? { url: image.url, alt: product.value.title } : null,
    type: "product",
    jsonLd: [
      productJsonLd({ product: product.value, canonicalUrl, siteUrl, brand: brand.name, rating }),
      breadcrumbJsonLd([
        { name: t("nav.home"), url: absoluteUrl(localePath("/"), siteUrl) },
        ...breadcrumbLinks.value.map((link) => ({
          name: link.name,
          url: absoluteUrl(localePath(link.path), siteUrl),
        })),
        { name: product.value.title, url: null },
      ]),
    ],
  }
})

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
        <template v-for="link in breadcrumbLinks" :key="link.path">
          <BreadcrumbItem>
            <BreadcrumbLink as-child>
              <NuxtLinkLocale :to="link.path">{{ link.name }}</NuxtLinkLocale>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
        </template>
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
          @click="scrollToReviews"
        >
          <StarRating
            :rating="reviewPage.average_rating ?? 0"
            :count="reviewPage.count"
            show-value
            size="sm"
          />
        </a>
        <ProductPurchase
          :product="product"
          :start-variant-id="startVariant?.id ?? null"
          @colour-change="colour = $event"
          @variant-change="onVariantChange"
        >
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
