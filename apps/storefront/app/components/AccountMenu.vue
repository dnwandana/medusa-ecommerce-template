<script setup lang="ts">
import { Heart, LogOut, Package, User, UserPen } from "@lucide/vue"

const { logout } = useCustomer()
const localePath = useLocalePath()

async function leave(): Promise<void> {
  await logout()
  await navigateTo(localePath("/"))
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="$t('nav.account')">
        <User aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem as-child>
        <NuxtLinkLocale to="/account">
          <UserPen aria-hidden="true" />
          {{ $t("nav.account") }}
        </NuxtLinkLocale>
      </DropdownMenuItem>
      <DropdownMenuItem as-child>
        <NuxtLinkLocale to="/account/orders">
          <Package aria-hidden="true" />
          {{ $t("account.orders") }}
        </NuxtLinkLocale>
      </DropdownMenuItem>
      <DropdownMenuItem as-child>
        <NuxtLinkLocale to="/account/wishlist">
          <Heart aria-hidden="true" />
          {{ $t("account.wishlist") }}
        </NuxtLinkLocale>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <!-- The select event also fires for the Enter key. A click event fires only for the pointer. -->
      <DropdownMenuItem @select="leave">
        <LogOut aria-hidden="true" />
        {{ $t("account.logout") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
