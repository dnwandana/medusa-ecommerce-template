<script setup lang="ts">
import { LayoutGrid, ShoppingBag } from "@lucide/vue"

// The layout loads the cart and the customer. The header only reads them.
const { itemCount } = useCart()
const { customer } = useCustomer()
const { brand } = useAppConfig()
</script>

<template>
  <header class="border-b border-border bg-background">
    <div class="mx-auto flex h-14 max-w-[1280px] items-center gap-2 pr-2 pl-4 md:h-[72px] md:px-6">
      <div class="flex items-center gap-6">
        <NuxtLinkLocale
          to="/"
          class="font-heading text-2xl font-bold tracking-[-0.02em] text-foreground"
        >
          {{ brand.name }}
        </NuxtLinkLocale>
        <Button as-child variant="ghost" class="hidden lg:inline-flex">
          <NuxtLinkLocale to="/products">
            <LayoutGrid class="size-[18px]" aria-hidden="true" />
            {{ $t("nav.products") }}
          </NuxtLinkLocale>
        </Button>
      </div>

      <div class="ml-auto hidden items-center gap-4 lg:flex">
        <LanguageSwitcher />
        <AccountMenu v-if="customer" />
        <Button v-else as-child variant="ghost">
          <NuxtLinkLocale to="/account/login">{{ $t("nav.login") }}</NuxtLinkLocale>
        </Button>
        <Button as-child variant="ghost">
          <NuxtLinkLocale to="/cart">
            <ShoppingBag class="size-[22px]" aria-hidden="true" />
            <span>{{ $t("nav.cart") }}</span>
            <!-- v-if, not v-show: an empty cart must show no "0" badge. -->
            <Badge v-if="itemCount > 0">{{ itemCount }}</Badge>
          </NuxtLinkLocale>
        </Button>
      </div>

      <div class="ml-auto flex items-center lg:hidden">
        <!-- The link has only an icon and a badge, so it needs an aria-label. -->
        <Button as-child variant="ghost" size="icon" class="relative">
          <NuxtLinkLocale to="/cart" :aria-label="$t('nav.cart')">
            <ShoppingBag class="size-[22px]" aria-hidden="true" />
            <Badge v-if="itemCount > 0" variant="dot">{{ itemCount }}</Badge>
          </NuxtLinkLocale>
        </Button>
        <AppMobileMenu />
      </div>
    </div>
  </header>
</template>
