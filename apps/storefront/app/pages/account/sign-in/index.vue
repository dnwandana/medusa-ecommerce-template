<script setup lang="ts">
import { CircleAlert } from "@lucide/vue"

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const flow = useMagicLink({
  onSignedIn: (path) => void navigateTo(localePath(path)),
})
const { phase, email, error, resendAt, sentAgain } = flow

const address = ref("")
const resending = ref(false)

// useMagicLink checks the redirect with safeRedirectPath.
const redirect = computed(() =>
  typeof route.query.redirect === "string" ? route.query.redirect : null
)

const fieldError = computed(() => (error.value === "invalid" ? t("auth.signIn.invalidEmail") : ""))
// The form and Check your email show the same text for a failed send.
const alertText = computed(() => {
  if (error.value === "rate_limited") {
    return t("auth.signIn.rateLimited")
  }
  return error.value === "failed" ? t("auth.signIn.failed") : ""
})

// The page shows the same "Check your email" for a known and an unknown email address.
// The email and the secret never go into the URL.
function submit(): void {
  void flow.requestLink(address.value, redirect.value)
}

async function resend(): Promise<void> {
  resending.value = true
  try {
    await flow.resend()
  } finally {
    resending.value = false
  }
}

function differentEmail(): void {
  flow.useDifferentEmail()
  // The flow keeps the email, so the form shows it again for a correction.
  address.value = email.value
}

// A reload of the page keeps "Check your email".
onMounted(() => {
  flow.resume()
})

useHead({ title: () => t("auth.signIn.title") })
useSeoMeta({ robots: "noindex" })
</script>

<template>
  <section class="mx-auto w-full max-w-[400px] pt-10 pb-16 md:pt-24 md:pb-32">
    <SignInCheckEmail
      v-if="phase === 'waiting' || phase === 'expired'"
      :email="email"
      :phase="phase"
      :resend-at="resendAt"
      :sent-again="sentAgain"
      :busy="resending"
      :error="alertText"
      @resend="resend"
      @different-email="differentEmail"
    />

    <div v-else class="flex flex-col gap-8 md:gap-10">
      <div class="flex flex-col items-center gap-4 text-center">
        <h1 class="text-h1">{{ $t("auth.signIn.title") }}</h1>
        <p class="text-body-sm text-muted-foreground">{{ $t("auth.signIn.intro") }}</p>
      </div>

      <form class="flex flex-col gap-6 md:gap-7" novalidate @submit.prevent="submit">
        <Field :data-invalid="fieldError ? true : undefined">
          <FieldLabel for="sign-in-email">{{ $t("auth.email") }}</FieldLabel>
          <Input
            id="sign-in-email"
            v-model="address"
            name="email"
            type="email"
            autocomplete="email"
            required
            :aria-invalid="fieldError ? true : undefined"
            :aria-describedby="fieldError ? 'sign-in-email-error' : undefined"
          />
          <FieldError v-if="fieldError" id="sign-in-email-error">{{ fieldError }}</FieldError>
        </Field>

        <Alert v-if="alertText" variant="warning">
          <CircleAlert :stroke-width="1.5" aria-hidden="true" />
          <AlertDescription>{{ alertText }}</AlertDescription>
        </Alert>

        <Button type="submit" class="w-full" :loading="phase === 'sending'">
          {{ phase === "sending" ? $t("auth.signIn.sending") : $t("auth.signIn.send") }}
        </Button>
      </form>

      <p class="text-center text-body-sm text-muted-foreground">
        {{ $t("auth.signIn.newAccount") }}
      </p>
    </div>
  </section>
</template>
