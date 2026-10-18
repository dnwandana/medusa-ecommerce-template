<script setup lang="ts">
definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { brand } = useAppConfig()
const { needsWelcome, completeWelcome } = useCustomer()

const fullName = ref("")
const nameMissing = ref(false)
const busy = ref(false)

// Some callers send a redirect with no locale prefix, for example "/checkout". localePath adds
// the prefix and does not add a second one to a path that has it.
const nextPath = computed(() => localePath(safeRedirectPath(route.query.redirect, "/account")))

// Continue and Skip both send the welcome email one time.
async function finish(name: string | null): Promise<void> {
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    await completeWelcome(name)
  } catch {
    // The welcome email does not stop the shopper. The backend writes welcome_sent_at before it
    // sends the email and keeps the mark when the send fails. Thus it does not send a failed
    // welcome email again.
  }
  await navigateTo(nextPath.value)
}

function submit(): void {
  const name = fullName.value.trim()
  nameMissing.value = name === ""
  if (nameMissing.value) {
    return
  }
  void finish(name)
}

function skip(): void {
  void finish(null)
}

onMounted(() => {
  if (!needsWelcome.value) {
    void navigateTo(nextPath.value)
  }
})

useHead({ title: () => t("auth.welcome.title", { store: brand.name }) })
useSeoMeta({ robots: "noindex" })
</script>

<template>
  <section class="mx-auto w-full max-w-[400px] pt-10 pb-16 md:pt-24 md:pb-32">
    <div class="flex flex-col gap-8 md:gap-10">
      <div class="flex flex-col items-center gap-4 text-center">
        <h1 class="text-h1">{{ $t("auth.welcome.title", { store: brand.name }) }}</h1>
        <p class="text-body-sm text-muted-foreground">{{ $t("auth.welcome.intro") }}</p>
      </div>

      <form class="flex flex-col gap-6 md:gap-7" novalidate @submit.prevent="submit">
        <Field :data-invalid="nameMissing ? true : undefined">
          <FieldLabel for="welcome-full-name">{{ $t("auth.welcome.fullName") }}</FieldLabel>
          <Input
            id="welcome-full-name"
            v-model="fullName"
            name="full_name"
            autocomplete="name"
            :disabled="busy"
            :aria-invalid="nameMissing ? true : undefined"
            :aria-describedby="nameMissing ? 'welcome-full-name-error' : undefined"
          />
          <FieldError v-if="nameMissing" id="welcome-full-name-error">
            {{ $t("auth.welcome.nameRequired") }}
          </FieldError>
        </Field>

        <Button type="submit" class="w-full" :loading="busy">
          {{ $t("auth.welcome.continue") }}
        </Button>
      </form>

      <div class="flex justify-center">
        <Button
          type="button"
          variant="link"
          class="min-h-11"
          data-testid="skip"
          :disabled="busy"
          @click="skip"
        >
          {{ $t("auth.welcome.skip") }}
        </Button>
      </div>
    </div>
  </section>
</template>
