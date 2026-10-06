<script setup lang="ts">
import { Mail, MailCheck } from "@lucide/vue"

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
  <AuthPanel :title="$t('auth.forgotTitle')">
    <!-- The card has its own padding, so the empty state needs less. -->
    <Empty v-if="sent" class="px-0 py-4">
      <EmptyHeader>
        <EmptyMedia tone="success">
          <MailCheck aria-hidden="true" />
        </EmptyMedia>
        <EmptyDescription role="status">{{ $t("auth.forgotSent") }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <div v-else class="flex flex-col gap-5">
      <p class="text-body-sm text-muted-foreground">{{ $t("auth.forgotIntro") }}</p>
      <form class="flex flex-col gap-5" @submit.prevent="submit">
        <Field>
          <FieldLabel for="forgot-email">{{ $t("auth.email") }}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Mail aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="forgot-email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
            />
          </InputGroup>
        </Field>
        <Button type="submit" size="lg" class="w-full" :disabled="busy">
          <Spinner v-if="busy" />
          {{ $t("auth.forgotAction") }}
        </Button>
      </form>
    </div>

    <template #after>
      <Button variant="link" as-child>
        <NuxtLinkLocale to="/account/login">{{ $t("auth.loginAction") }}</NuxtLinkLocale>
      </Button>
    </template>
  </AuthPanel>
</template>
