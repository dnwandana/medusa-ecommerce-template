<script setup lang="ts">
const { t } = useI18n()
const { requestPasswordReset } = useCustomer()

const email = ref("")
const busy = ref(false)
const sent = ref(false)

// Requests the reset link. The result is the same for each email address.
async function submit(): Promise<void> {
  busy.value = true
  try {
    await requestPasswordReset(email.value)
  } catch {
    // Ignore the error. A different text would tell which email addresses have an account.
  }
  sent.value = true
  busy.value = false
}

useHead({ title: () => t("auth.forgotTitle") })
</script>

<template>
  <section class="mx-auto flex max-w-sm flex-col gap-6 py-8">
    <h1 class="text-2xl font-semibold">{{ $t("auth.forgotTitle") }}</h1>

    <p v-if="sent" role="status">{{ $t("auth.forgotSent") }}</p>

    <template v-else>
      <p class="text-sm text-muted-foreground">{{ $t("auth.forgotIntro") }}</p>
      <Card class="p-6">
        <form class="flex flex-col gap-4" @submit.prevent="submit">
          <div class="flex flex-col gap-2">
            <Label for="forgot-email">{{ $t("auth.email") }}</Label>
            <Input
              id="forgot-email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
            />
          </div>
          <Button type="submit" :disabled="busy">{{ $t("auth.forgotAction") }}</Button>
        </form>
      </Card>
    </template>

    <NuxtLinkLocale to="/account/login" class="text-sm underline underline-offset-4">
      {{ $t("auth.loginAction") }}
    </NuxtLinkLocale>
  </section>
</template>
