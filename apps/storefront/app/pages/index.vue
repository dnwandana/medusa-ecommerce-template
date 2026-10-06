<script setup lang="ts">
const { t, locale } = useI18n()
const catalog = useCatalog()

const { data, error } = await useAsyncData(
  () => `home:${locale.value}`,
  () => catalog.listProducts({ limit: 8 })
)

useHead({ title: () => t("home.title") })
</script>

<template>
  <div>
    <!-- The design hero is text only, with no image. -->
    <section class="flex flex-col items-start gap-4 rounded-xl bg-backdrop-sand px-5 py-10 md:px-16 md:py-24">
      <h1 class="text-display max-w-[16ch]">{{ $t("home.title") }}</h1>
      <p class="text-body-lg max-w-[52ch] text-muted-foreground">{{ $t("home.subtitle") }}</p>
      <Button as-child size="lg">
        <NuxtLinkLocale to="/products">{{ $t("home.viewAll") }}</NuxtLinkLocale>
      </Button>
    </section>

    <section class="mt-12 flex flex-col gap-6">
      <h2 class="text-h2">{{ $t("home.newProducts") }}</h2>
      <ProductGrid
        :products="data?.products ?? []"
        :empty-text="$t('products.empty')"
        :error="!!error"
        :skeletons="8"
      />
    </section>
  </div>
</template>
