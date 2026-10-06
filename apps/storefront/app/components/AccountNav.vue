<script setup lang="ts">
import { Heart, LogOut, Package, UserPen } from "@lucide/vue"

const route = useRoute()
const localePath = useLocalePath()
const { logout } = useCustomer()

const links = [
  { to: "/account", icon: UserPen, label: "account.profile" },
  { to: "/account/orders", icon: Package, label: "account.orders" },
  { to: "/account/wishlist", icon: Heart, label: "account.wishlist" },
]

// Sets aria-current from the route. The "on" style of the ghost button reads this attribute.
function current(to: string): "page" | undefined {
  return route.path === localePath(to) ? "page" : undefined
}

// Logs out and opens the home page.
async function leave(): Promise<void> {
  await logout()
  await navigateTo(localePath("/"))
}
</script>

<template>
  <!--
    The grid areas move the one logout button. Below md it sits next to the title.
    At md and above it sits under the side nav. Thus the DOM has only one logout button.
  -->
  <div
    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-y-6 [grid-template-areas:'title_logout'_'tabs_tabs'_'content_content'] md:grid-cols-[220px_minmax(0,1fr)] md:grid-rows-[auto_auto_1fr] md:items-start md:gap-x-12 md:gap-y-0 md:[grid-template-areas:'title_title'_'nav_content'_'logout_content']"
  >
    <h1 class="text-h1 [grid-area:title] md:mb-6">{{ $t("account.title") }}</h1>

    <nav :aria-label="$t('account.title')" class="hidden gap-1 [grid-area:nav] md:flex md:flex-col">
      <Button
        v-for="link in links"
        :key="link.to"
        as-child
        variant="ghost"
        class="w-full justify-start"
      >
        <NuxtLinkLocale :to="link.to" :aria-current="current(link.to)">
          <component :is="link.icon" aria-hidden="true" />
          {{ $t(link.label) }}
        </NuxtLinkLocale>
      </Button>
      <Separator class="my-2" />
    </nav>

    <Tabs :model-value="route.path" class="[grid-area:tabs] md:hidden">
      <TabsList class="w-full justify-start">
        <TabsTrigger v-for="link in links" :key="link.to" as-child :value="localePath(link.to)">
          <NuxtLinkLocale :to="link.to">
            <component :is="link.icon" aria-hidden="true" />
            {{ $t(link.label) }}
          </NuxtLinkLocale>
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <Button
      type="button"
      variant="ghost"
      data-testid="logout"
      class="justify-self-end [grid-area:logout] md:w-full md:justify-start md:self-start"
      @click="leave"
    >
      <LogOut aria-hidden="true" />
      {{ $t("account.logout") }}
    </Button>

    <div class="min-w-0 [grid-area:content]">
      <slot />
    </div>
  </div>
</template>
