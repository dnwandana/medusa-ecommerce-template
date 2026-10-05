<script setup lang="ts">
const MIN_PASSWORD_LENGTH = 8

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { resetPassword } = useCustomer()

// The reset email links here with the token and the email address in the query.
const token = computed(() => (typeof route.query.token === "string" ? route.query.token : ""))
const email = computed(() => (typeof route.query.email === "string" ? route.query.email : ""))
const complete = computed(() => token.value !== "" && email.value !== "")

const password = ref("")
const busy = ref(false)
// A message key, or null.
const error = ref<string | null>(null)

// Saves the new password and opens the login page.
async function submit(): Promise<void> {
  error.value = null
  // A short password sends no request.
  if (password.value.length < MIN_PASSWORD_LENGTH) {
    error.value = "auth.passwordHint"
    return
  }
  busy.value = true
  try {
    // Only the backend gets the token. The page does not show or store it.
    await resetPassword({ email: email.value, password: password.value, token: token.value })
    await navigateTo({ path: localePath("/account/login"), query: { reset: "1" } })
  } catch {
    error.value = "auth.resetFailed"
  } finally {
    busy.value = false
  }
}

useHead({ title: () => t("auth.resetTitle") })
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col gap-6 py-8">
    <h1 class="text-2xl font-semibold">{{ $t("auth.resetTitle") }}</h1>

    <p v-if="!complete" role="alert" class="text-sm text-destructive">
      {{ $t("auth.resetIncomplete") }}
    </p>

    <Card v-else class="p-6">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <div class="flex flex-col gap-2">
          <Label for="reset-password">{{ $t("auth.newPassword") }}</Label>
          <Input
            id="reset-password"
            v-model="password"
            name="password"
            type="password"
            autocomplete="new-password"
            aria-describedby="reset-password-hint"
          />
          <!-- The hint has no role="alert". Only the error is an alert. -->
          <p id="reset-password-hint" class="text-sm text-muted-foreground">
            {{ $t("auth.passwordHint") }}
          </p>
        </div>

        <p v-if="error" role="alert" class="text-sm text-destructive">{{ $t(error) }}</p>

        <Button type="submit" :disabled="busy">{{ $t("auth.resetAction") }}</Button>
      </form>
    </Card>

    <NuxtLinkLocale
      v-if="!complete || error === 'auth.resetFailed'"
      to="/account/forgot-password"
      class="text-sm underline underline-offset-4"
    >
      {{ $t("auth.forgotAction") }}
    </NuxtLinkLocale>
  </section>
</template>
