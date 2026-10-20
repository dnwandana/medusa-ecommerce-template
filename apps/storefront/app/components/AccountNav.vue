<script setup lang="ts">
import { LogOut } from "@lucide/vue"

const route = useRoute()
const localePath = useLocalePath()
const { logout } = useCustomer()

// The side nav shows no item counts.
const links = [
  { to: "/account", label: "account.profile" },
  { to: "/account/orders", label: "account.orders" },
  { to: "/account/addresses", label: "account.addresses.title" },
  { to: "/account/wishlist", label: "account.wishlist" },
]

// Sets aria-current from the route. The style of the current row and tab reads this attribute.
function current(to: string): "page" | undefined {
  return route.path === localePath(to) ? "page" : undefined
}

// Signs out and opens the home page.
async function leave(): Promise<void> {
  await logout()
  await navigateTo(localePath("/"))
}
</script>

<template>
  <!--
    The grid areas move the one "Sign out" button. Below md it sits next to the heading.
    At md and above it sits under the side nav. Thus the DOM has only one "Sign out" button.
  -->
  <div
    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-y-6 pt-6 pb-16 [grid-template-areas:'title_logout'_'tabs_tabs'_'content_content'] md:grid-cols-[180px_minmax(0,1fr)] md:grid-rows-[auto_auto_1fr] md:items-start md:gap-x-12 md:gap-y-0 md:pt-12 md:pb-32 md:[grid-template-areas:'title_title'_'nav_content'_'logout_content'] lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-x-24"
  >
    <AccountShell class="[grid-area:title] md:mb-12" />

    <nav
      :aria-label="$t('account.title')"
      data-testid="side-nav"
      class="hidden [grid-area:nav] md:flex md:flex-col"
    >
      <NuxtLinkLocale
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :aria-current="current(link.to)"
        class="flex min-h-12 items-center border-b border-border text-nav text-foreground first:border-t hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none aria-[current=page]:font-heading aria-[current=page]:text-[20px] aria-[current=page]:leading-7 aria-[current=page]:tracking-normal aria-[current=page]:normal-case aria-[current=page]:italic"
      >
        {{ $t(link.label) }}
      </NuxtLinkLocale>
    </nav>

    <nav
      :aria-label="$t('account.title')"
      data-testid="account-tabs"
      class="-mr-4 flex [scrollbar-width:none] gap-6 overflow-x-auto border-b border-border pr-4 [grid-area:tabs] md:hidden"
    >
      <NuxtLinkLocale
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :aria-current="current(link.to)"
        class="-mb-px flex min-h-12 shrink-0 items-center border-b border-transparent text-nav whitespace-nowrap text-foreground focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none aria-[current=page]:border-foreground"
      >
        {{ $t(link.label) }}
      </NuxtLinkLocale>
    </nav>

    <button
      type="button"
      data-testid="sign-out"
      class="flex min-h-11 items-center gap-3 justify-self-end text-nav text-muted-foreground [grid-area:logout] hover:text-foreground focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none md:mt-6 md:min-h-14 md:justify-self-start"
      @click="leave"
    >
      <LogOut :size="18" :stroke-width="1.5" aria-hidden="true" />
      {{ $t("nav.signOut") }}
    </button>

    <div class="min-w-0 [grid-area:content]">
      <slot />
    </div>
  </div>
</template>
