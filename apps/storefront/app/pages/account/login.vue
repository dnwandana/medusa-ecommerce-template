<script setup lang="ts">
import { Mail } from "@lucide/vue"

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
  <AuthPanel :title="$t('auth.loginTitle')">
    <template #before>
      <Alert v-if="resetDone" variant="success" class="w-full">
        <AlertDescription>{{ $t("auth.resetDone") }}</AlertDescription>
      </Alert>
    </template>

    <form class="flex flex-col gap-5" @submit.prevent="submit">
      <Field>
        <FieldLabel for="login-email">{{ $t("auth.email") }}</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <Mail aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id="login-email"
            v-model="email"
            name="email"
            type="email"
            autocomplete="email"
            required
          />
        </InputGroup>
      </Field>
      <Field>
        <div class="flex items-center justify-between gap-2">
          <FieldLabel for="login-password">{{ $t("auth.password") }}</FieldLabel>
          <NuxtLinkLocale
            to="/account/forgot-password"
            class="text-body-sm text-link underline-offset-4 hover:underline"
          >
            {{ $t("auth.forgotLink") }}
          </NuxtLinkLocale>
        </div>
        <PasswordInput id="login-password" v-model="password" autocomplete="current-password" />
      </Field>

      <Alert v-if="failed" variant="destructive">
        <AlertDescription>{{ $t("auth.loginFailed") }}</AlertDescription>
      </Alert>

      <Button type="submit" size="lg" class="w-full" :disabled="busy">
        <Spinner v-if="busy" />
        {{ $t("auth.loginAction") }}
      </Button>
    </form>

    <template #after>
      <div class="flex w-full items-center gap-3">
        <Separator class="flex-1" />
        <span class="text-body-sm text-muted-foreground">{{ $t("auth.newHere") }}</span>
        <Separator class="flex-1" />
      </div>
      <Button variant="outline" size="lg" class="w-full" as-child>
        <NuxtLinkLocale to="/account/register">{{ $t("auth.noAccount") }}</NuxtLinkLocale>
      </Button>
    </template>
  </AuthPanel>
</template>
