<script setup lang="ts">
import { ArrowLeft, Lock } from "@lucide/vue"

const { brand } = useAppConfig()
const { load } = useCart()
const { refresh } = useCustomer()

const year = new Date().getFullYear()

useLayoutHead()
// Only /checkout and /checkout/return use this layout, and no checkout page may be indexed.
// The route rules also send X-Robots-Tag: noindex. The meta tag keeps the rule in the HTML.
useSeoMeta({ robots: "noindex" })

// The cart and the login state come from cookies of the browser. Load them after the mount.
// The return page of a payment gateway also gets the cart id from this load.
onMounted(() => {
  // A failed request must not break the header.
  load().catch(() => {})
  refresh().catch(() => {})
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <!-- The header has no navigation, so the customer stays in the checkout. -->
    <header class="border-b border-border bg-background">
      <div
        class="mx-auto grid h-[60px] w-full max-w-[1440px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-4 md:px-12 lg:h-20"
      >
        <NuxtLinkLocale
          to="/cart"
          class="inline-flex min-h-11 items-center gap-2 justify-self-start text-nav text-foreground outline-none focus-visible:shadow-focus"
        >
          <ArrowLeft class="size-[18px]" :stroke-width="1.5" aria-hidden="true" />
          <span class="max-sm:sr-only">{{ $t("checkoutLayout.back") }}</span>
        </NuxtLinkLocale>
        <AppWordmark />
        <p class="flex items-center gap-2 justify-self-end text-nav text-muted-foreground">
          <Lock class="size-4" :stroke-width="1.5" aria-hidden="true" />
          <span class="max-sm:sr-only">{{ $t("checkoutLayout.secure") }}</span>
        </p>
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1440px] flex-1 px-4 md:px-12">
      <slot />
    </main>

    <footer class="border-t border-border">
      <div
        class="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-12"
      >
        <p class="text-caption text-muted-foreground">
          {{ $t("footer.copyright", { year, brand: brand.name }) }}
        </p>
        <ul class="flex items-center gap-6 text-caption">
          <li>
            <NuxtLinkLocale
              to="/privacy"
              class="inline-flex min-h-11 items-center text-muted-foreground outline-none hover:text-foreground focus-visible:shadow-focus"
            >
              {{ $t("footer.privacy") }}
            </NuxtLinkLocale>
          </li>
          <li>
            <NuxtLinkLocale
              to="/terms"
              class="inline-flex min-h-11 items-center text-muted-foreground outline-none hover:text-foreground focus-visible:shadow-focus"
            >
              {{ $t("footer.terms") }}
            </NuxtLinkLocale>
          </li>
          <li>
            <NuxtLinkLocale
              to="/contact"
              class="inline-flex min-h-11 items-center text-muted-foreground outline-none hover:text-foreground focus-visible:shadow-focus"
            >
              {{ $t("checkoutLayout.help") }}
            </NuxtLinkLocale>
          </li>
        </ul>
      </div>
    </footer>

    <!-- vue-sonner shows the toasts at full width at the top of a narrow screen. Thus one position is enough. -->
    <Sonner position="top-right" />
  </div>
</template>
