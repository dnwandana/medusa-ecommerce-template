<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { login } = useCustomer()

const email = ref("")
const password = ref("")
const busy = ref(false)
const failed = ref(false)

const resetDone = computed(() => route.query.reset === "1")

// Logs in and opens the page that the visitor asked for.
async function submit(): Promise<void> {
  busy.value = true
  failed.value = false
  try {
    await login(email.value, password.value)
    // The redirect parameter comes from the URL. Only a path of this site is a valid target.
    await navigateTo(safeRedirectPath(route.query.redirect, localePath("/account")))
  } catch {
    // Show one text for each error. The text does not tell which value is wrong.
    failed.value = true
  } finally {
    busy.value = false
  }
}

useHead({ title: () => t("auth.loginTitle") })
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col gap-6 py-8">
    <h1 class="text-2xl font-semibold">{{ $t("auth.loginTitle") }}</h1>

    <p v-if="resetDone" role="status" class="text-sm">{{ $t("auth.resetDone") }}</p>

    <Card class="p-6">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div class="flex flex-col gap-2">
          <Label for="login-email">{{ $t("auth.email") }}</Label>
          <Input
            id="login-email"
            v-model="email"
            name="email"
            type="email"
            autocomplete="email"
            required
          />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="login-password">{{ $t("auth.password") }}</Label>
          <Input
            id="login-password"
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>

        <p v-if="failed" role="alert" class="text-sm text-destructive">
          {{ $t("auth.loginFailed") }}
        </p>

        <Button type="submit" :disabled="busy">{{ $t("auth.loginAction") }}</Button>
      </form>
    </Card>

    <div class="flex flex-col gap-2 text-sm">
      <NuxtLinkLocale to="/account/forgot-password" class="underline underline-offset-4">
        {{ $t("auth.forgotLink") }}
      </NuxtLinkLocale>
      <NuxtLinkLocale to="/account/register" class="underline underline-offset-4">
        {{ $t("auth.noAccount") }}
      </NuxtLinkLocale>
    </div>
  </section>
</template>
