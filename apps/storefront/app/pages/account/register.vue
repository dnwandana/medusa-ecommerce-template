<script setup lang="ts">
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
  <section class="mx-auto flex max-w-sm flex-col gap-6 py-8">
    <h1 class="text-2xl font-semibold">{{ $t("auth.registerTitle") }}</h1>

    <Card class="p-6">
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <div class="flex flex-col gap-2">
          <Label for="register-first-name">{{ $t("auth.firstName") }}</Label>
          <Input
            id="register-first-name"
            v-model="form.first_name"
            name="first_name"
            autocomplete="given-name"
          />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="register-last-name">{{ $t("auth.lastName") }}</Label>
          <Input
            id="register-last-name"
            v-model="form.last_name"
            name="last_name"
            autocomplete="family-name"
          />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="register-email">{{ $t("auth.email") }}</Label>
          <Input
            id="register-email"
            v-model="form.email"
            name="email"
            type="email"
            autocomplete="email"
          />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="register-password">{{ $t("auth.password") }}</Label>
          <Input
            id="register-password"
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="new-password"
          />
        </div>

        <p v-if="error" role="alert" class="text-sm text-destructive">{{ $t(error) }}</p>

        <Button type="submit" :disabled="busy">{{ $t("auth.registerAction") }}</Button>
      </form>
    </Card>

    <NuxtLinkLocale to="/account/login" class="text-sm underline underline-offset-4">
      {{ $t("auth.haveAccount") }}
    </NuxtLinkLocale>
  </section>
</template>
