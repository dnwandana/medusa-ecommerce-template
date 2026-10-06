<script setup lang="ts">
const { locale } = useI18n()
const { load } = useCart()
const { refresh } = useCustomer()

useHead({ htmlAttrs: { lang: locale } })

// The cart and the login state come from cookies of the browser. Load them after the mount.
onMounted(() => {
  // A failed request must not break the header.
  load().catch(() => {})
  refresh().catch(() => {})
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <AppHeader />
    <main class="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-16 md:px-6 md:pt-12 md:pb-24">
      <slot />
    </main>
    <AppFooter />
    <!-- vue-sonner shows the toasts at full width at the top of a narrow screen. Thus one position is enough. -->
    <Sonner position="top-right" />
  </div>
</template>
