<script setup lang="ts">
import { Heart, LogOut, MapPin, Package, User, UserPen } from "@lucide/vue"

const { customer, logout } = useCustomer()
const localePath = useLocalePath()

// A customer can have no name, so the email is the fallback.
const name = computed(() => {
  if (!customer.value) return ""
  const full = [customer.value.first_name, customer.value.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
  return full || customer.value.email
})

const items = [
  { to: "/account", label: "nav.profile", icon: UserPen },
  { to: "/account/orders", label: "nav.orders", icon: Package },
  { to: "/account/addresses", label: "nav.addresses", icon: MapPin },
  { to: "/account/wishlist", label: "nav.wishlist", icon: Heart },
]

async function leave(): Promise<void> {
  await logout()
  await navigateTo(localePath("/"))
}
</script>

<template>
  <Button v-if="!customer" as-child variant="ghost" size="icon">
    <NuxtLinkLocale :to="SIGN_IN_PATH" :aria-label="$t('nav.signIn')">
      <User :stroke-width="1.5" aria-hidden="true" />
    </NuxtLinkLocale>
  </Button>
  <DropdownMenu v-else>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :aria-label="$t('nav.accountFor', { name })">
        <User :stroke-width="1.5" aria-hidden="true" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel class="text-body-sm">{{ name }}</DropdownMenuLabel>
      <DropdownMenuItem v-for="item in items" :key="item.to" as-child>
        <NuxtLinkLocale :to="item.to">
          <component :is="item.icon" :stroke-width="1.5" aria-hidden="true" />
          {{ $t(item.label) }}
        </NuxtLinkLocale>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <!-- The select event also fires for the Enter key. A click event fires only for the pointer. -->
      <DropdownMenuItem @select="leave">
        <LogOut :stroke-width="1.5" aria-hidden="true" />
        {{ $t("nav.signOut") }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
