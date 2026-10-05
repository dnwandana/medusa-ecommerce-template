<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"

definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const localePath = useLocalePath()
const { customer, updateProfile, logout } = useCustomer()

const form = reactive({ first_name: "", last_name: "", phone: "" })
const busy = ref(false)
const saved = ref(false)
const failed = ref(false)

// Copies the profile fields of the customer into the form.
function fill(current: HttpTypes.StoreCustomer | null): void {
  form.first_name = current?.first_name ?? ""
  form.last_name = current?.last_name ?? ""
  form.phone = current?.phone ?? ""
}

watch(customer, fill, { immediate: true })

// Saves the profile fields of the form.
async function save(): Promise<void> {
  saved.value = false
  failed.value = false
  busy.value = true
  try {
    await updateProfile({ ...form })
    saved.value = true
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}

// Logs out and opens the home page.
async function leave(): Promise<void> {
  await logout()
  await navigateTo(localePath("/"))
}

useHead({ title: () => t("account.title") })
</script>

<template>
  <div class="flex max-w-xl flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ $t("account.title") }}</h1>

    <nav class="flex gap-4">
      <NuxtLinkLocale to="/account/orders" class="underline underline-offset-4">
        {{ $t("account.orders") }}
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/account/wishlist" class="underline underline-offset-4">
        {{ $t("account.wishlist") }}
      </NuxtLinkLocale>
    </nav>

    <section class="flex flex-col gap-4">
      <h2 class="text-xl font-semibold">{{ $t("account.profile") }}</h2>

      <div class="flex flex-col gap-1">
        <span class="text-sm font-medium">{{ $t("auth.email") }}</span>
        <span>{{ customer?.email }}</span>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="save">
        <div class="flex flex-col gap-1">
          <Label for="account-first-name">{{ $t("auth.firstName") }}</Label>
          <Input id="account-first-name" v-model="form.first_name" name="first_name" />
        </div>
        <div class="flex flex-col gap-1">
          <Label for="account-last-name">{{ $t("auth.lastName") }}</Label>
          <Input id="account-last-name" v-model="form.last_name" name="last_name" />
        </div>
        <div class="flex flex-col gap-1">
          <Label for="account-phone">{{ $t("account.phone") }}</Label>
          <Input id="account-phone" v-model="form.phone" name="phone" type="tel" />
        </div>

        <p v-if="saved" role="status" class="text-sm">{{ $t("account.saved") }}</p>
        <p v-if="failed" role="alert" class="text-sm text-destructive">{{ $t("common.error") }}</p>

        <div>
          <Button type="submit" :disabled="busy">{{ $t("common.save") }}</Button>
        </div>
      </form>
    </section>

    <div>
      <Button type="button" variant="outline" data-testid="logout" @click="leave">
        {{ $t("account.logout") }}
      </Button>
    </div>
  </div>
</template>
