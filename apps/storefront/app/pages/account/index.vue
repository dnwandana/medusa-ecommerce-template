<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { CircleAlert, CircleCheck, Phone } from "@lucide/vue"
import { joinFullName, splitFullName } from "~/utils/addressForm"

definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const { customer, updateProfile } = useCustomer()

const form = reactive({ full_name: "", phone: "" })
const busy = ref(false)
const saved = ref(false)
const failed = ref(false)

// Copies the profile fields of the customer into the form.
function fill(current: HttpTypes.StoreCustomer | null): void {
  form.full_name = joinFullName(current?.first_name, current?.last_name)
  form.phone = current?.phone ?? ""
}

watch(customer, fill, { immediate: true })

// A change by the customer after a save makes the saved text old. The input event does not
// fire when fill() copies the saved profile into the form.
function edited(): void {
  saved.value = false
}

// Saves the profile. The profile does not require a name, so an empty name saves empty names.
async function save(): Promise<void> {
  saved.value = false
  failed.value = false
  busy.value = true
  try {
    await updateProfile({ ...splitFullName(form.full_name), phone: form.phone })
    saved.value = true
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}

useHead({ title: () => t("account.title") })
</script>

<template>
  <AccountNav>
    <section aria-labelledby="profile-title" class="flex flex-col gap-8">
      <div class="border-b border-border pb-4">
        <h2 id="profile-title" class="text-h3 font-normal">{{ $t("account.profile") }}</h2>
      </div>

      <form
        class="flex max-w-[640px] flex-col gap-8"
        novalidate
        @submit.prevent="save"
        @input="edited"
      >
        <div class="flex flex-col gap-2">
          <p class="text-field-label text-foreground uppercase">{{ $t("account.email") }}</p>
          <p class="text-body">{{ customer?.email }}</p>
        </div>

        <Field>
          <FieldLabel for="account-full-name">{{ $t("account.fullName") }}</FieldLabel>
          <Input
            id="account-full-name"
            v-model="form.full_name"
            name="full_name"
            autocomplete="name"
          />
        </Field>

        <Field>
          <FieldLabel for="account-phone">{{ $t("account.phone") }}</FieldLabel>
          <div class="relative flex items-center">
            <Input
              id="account-phone"
              v-model="form.phone"
              name="phone"
              type="tel"
              autocomplete="tel"
              class="pr-11"
            />
            <Phone
              :size="18"
              :stroke-width="1.5"
              aria-hidden="true"
              class="pointer-events-none absolute right-1 text-icon-subtle"
            />
          </div>
        </Field>

        <Alert v-if="failed" variant="destructive">
          <CircleAlert :stroke-width="1.5" aria-hidden="true" />
          <AlertDescription>{{ $t("account.saveError") }}</AlertDescription>
        </Alert>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
          <Button type="submit" :loading="busy">
            {{ busy ? $t("account.saving") : $t("common.save") }}
          </Button>
          <p v-if="saved" role="status" class="flex items-center gap-2 text-body-sm text-success">
            <CircleCheck :size="16" :stroke-width="1.5" aria-hidden="true" />
            {{ $t("account.saved") }}
          </p>
        </div>
      </form>
    </section>
  </AccountNav>
</template>
