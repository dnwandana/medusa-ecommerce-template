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
  <AuthPanel :title="$t('auth.resetTitle')">
    <Alert v-if="!complete" variant="destructive">
      <AlertDescription>{{ $t("auth.resetIncomplete") }}</AlertDescription>
    </Alert>

    <form v-else class="flex flex-col gap-5" novalidate @submit.prevent="submit">
      <Field>
        <FieldLabel for="reset-password">{{ $t("auth.newPassword") }}</FieldLabel>
        <PasswordInput
          id="reset-password"
          v-model="password"
          autocomplete="new-password"
          describedby="reset-password-hint"
          :invalid="error === 'auth.passwordHint'"
        />
        <!-- The hint has no role="alert". Only the error is an alert. -->
        <FieldDescription id="reset-password-hint">{{ $t("auth.passwordHint") }}</FieldDescription>
        <FieldError v-if="error === 'auth.passwordHint'">{{ $t("auth.passwordHint") }}</FieldError>
      </Field>

      <Alert v-if="error === 'auth.resetFailed'" variant="destructive">
        <AlertDescription>{{ $t("auth.resetFailed") }}</AlertDescription>
      </Alert>

      <Button type="submit" size="lg" class="w-full" :disabled="busy">
        <Spinner v-if="busy" />
        {{ $t("auth.resetAction") }}
      </Button>
    </form>

    <template #after>
      <Button
        v-if="!complete || error === 'auth.resetFailed'"
        variant="outline"
        size="lg"
        class="w-full"
        as-child
      >
        <NuxtLinkLocale to="/account/forgot-password">{{ $t("auth.forgotAction") }}</NuxtLinkLocale>
      </Button>
    </template>
  </AuthPanel>
</template>
