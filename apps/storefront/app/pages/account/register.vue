<script setup lang="ts">
import { Mail } from "@lucide/vue"

const MIN_PASSWORD_LENGTH = 8

const { t } = useI18n()
const localePath = useLocalePath()
const { register } = useCustomer()

const form = reactive({ first_name: "", last_name: "", email: "", password: "" })
const busy = ref(false)
// A message key, or null.
const error = ref<string | null>(null)

// Creates the account, logs in, and opens the account page.
async function submit(): Promise<void> {
  error.value = null
  // A short password sends no request.
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    error.value = "auth.passwordHint"
    return
  }
  busy.value = true
  try {
    // register of useCustomer also logs in.
    await register({ ...form })
    await navigateTo(localePath("/account"))
  } catch {
    error.value = "auth.registerFailed"
  } finally {
    busy.value = false
  }
}

useHead({ title: () => t("auth.registerTitle") })
</script>

<template>
  <AuthPanel :title="$t('auth.registerTitle')">
    <form class="flex flex-col gap-5" novalidate @submit.prevent="submit">
      <FieldGroup class="two-col">
        <Field>
          <FieldLabel for="register-first-name">{{ $t("auth.firstName") }}</FieldLabel>
          <Input
            id="register-first-name"
            v-model="form.first_name"
            name="first_name"
            autocomplete="given-name"
          />
        </Field>
        <Field>
          <FieldLabel for="register-last-name">{{ $t("auth.lastName") }}</FieldLabel>
          <Input
            id="register-last-name"
            v-model="form.last_name"
            name="last_name"
            autocomplete="family-name"
          />
        </Field>
      </FieldGroup>
      <Field>
        <FieldLabel for="register-email">{{ $t("auth.email") }}</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Mail aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id="register-email"
            v-model="form.email"
            name="email"
            type="email"
            autocomplete="email"
          />
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel for="register-password">{{ $t("auth.password") }}</FieldLabel>
        <PasswordInput
          id="register-password"
          v-model="form.password"
          autocomplete="new-password"
          describedby="register-password-hint"
          :invalid="error === 'auth.passwordHint'"
        />
        <!-- The hint has no role="alert". Only the error is an alert. -->
        <FieldDescription id="register-password-hint">{{
          $t("auth.passwordHint")
        }}</FieldDescription>
        <FieldError v-if="error === 'auth.passwordHint'">{{ $t("auth.passwordHint") }}</FieldError>
      </Field>

      <Alert v-if="error && error !== 'auth.passwordHint'" variant="destructive">
        <AlertDescription>{{ $t(error) }}</AlertDescription>
      </Alert>

      <Button type="submit" size="lg" class="w-full" :disabled="busy">
        <Spinner v-if="busy" />
        {{ $t("auth.registerAction") }}
      </Button>
    </form>

    <template #after>
      <div class="flex w-full items-center gap-3">
        <Separator class="flex-1" />
        <span class="text-body-sm text-muted-foreground">{{ $t("auth.haveAccountShort") }}</span>
        <Separator class="flex-1" />
      </div>
      <Button variant="outline" size="lg" class="w-full" as-child>
        <NuxtLinkLocale to="/account/login">{{ $t("auth.haveAccount") }}</NuxtLinkLocale>
      </Button>
    </template>
  </AuthPanel>
</template>
