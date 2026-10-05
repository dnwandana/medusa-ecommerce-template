<script setup lang="ts">
const { locale } = useI18n()
const { itemCount, load } = useCart()
const { customer, refresh } = useCustomer()

useHead({ htmlAttrs: { lang: locale } })

// The cart and the login state come from cookies of the browser. Load them after the mount.
onMounted(() => {
  // A failed request must not break the header.
  load().catch(() => {})
  refresh().catch(() => {})
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b">
      <div class="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
        <NuxtLinkLocale to="/" class="font-semibold">{{ $t("nav.home") }}</NuxtLinkLocale>
        <NuxtLinkLocale to="/products" class="text-sm">{{ $t("nav.products") }}</NuxtLinkLocale>
        <div class="ml-auto flex items-center gap-4">
          <NuxtLinkLocale to="/cart" class="flex items-center gap-1 text-sm">
            {{ $t("nav.cart") }}
            <Badge v-if="itemCount > 0">{{ itemCount }}</Badge>
          </NuxtLinkLocale>
          <NuxtLinkLocale v-if="customer" to="/account" class="text-sm">
            {{ $t("nav.account") }}
          </NuxtLinkLocale>
          <NuxtLinkLocale v-else to="/account/login" class="text-sm">
            {{ $t("nav.login") }}
          </NuxtLinkLocale>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
