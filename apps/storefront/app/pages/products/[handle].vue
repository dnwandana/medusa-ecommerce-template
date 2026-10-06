<script setup lang="ts">
import { ImageOff } from "@lucide/vue"

const { t, locale } = useI18n()
const route = useRoute()
const catalog = useCatalog()

const handle = computed(() => String(route.params.handle))

const { data: product } = await useAsyncData(
  () => `product:${locale.value}:${handle.value}`,
  () => catalog.getProductByHandle(handle.value)
)

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: t("products.notFound"), fatal: true })
}

useHead({ title: () => product.value?.title ?? "" })
</script>

<template>
  <div v-if="product" class="flex flex-col gap-12 md:gap-16">
    <div class="flex flex-col gap-6">
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
            <BreadcrumbPage>{{ product.title }}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div class="grid gap-6 md:grid-cols-2 md:gap-16">
        <AspectRatio :ratio="3 / 4" class="overflow-hidden rounded-lg bg-muted">
          <img
            v-if="product.thumbnail"
            :src="product.thumbnail"
            :alt="product.title"
            class="size-full object-cover"
          />
          <div v-else class="flex size-full items-center justify-center">
            <ImageOff class="size-12 text-icon-subtle" aria-hidden="true" />
          </div>
        </AspectRatio>

        <div class="flex flex-col gap-6">
          <h1 class="text-h1">{{ product.title }}</h1>
          <ProductPurchase :product="product">
            <p v-if="product.description" class="whitespace-pre-line text-body-lg text-muted-foreground">
              {{ product.description }}
            </p>
          </ProductPurchase>
          <TrustLines />
        </div>
      </div>
    </div>

    <ReviewList :product-id="product.id" />
  </div>
</template>
