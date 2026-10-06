<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { Phone } from "@lucide/vue"

definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const { customer, updateProfile } = useCustomer()

const form = reactive({ first_name: "", last_name: "", phone: "" })
const busy = ref(false)
const saved = ref(false)
const failed = ref(false)

// Copies the profile fields of the customer into the form.
function fill(current: HttpTypes.StoreCustomer | null): void {
  form.first_name = current?.first_name ?? ""
  form.last_name = current?.last_name ?? ""
  form.phone = current?.phone ?? ""
}

watch(customer, fill, { immediate: true })

// Saves the profile fields of the form.
async function save(): Promise<void> {
  saved.value = false
  failed.value = false
  busy.value = true
  try {
    await updateProfile({ ...form })
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
    <!-- The form holds the whole Card, so the button in the Card footer submits it. -->
    <form class="max-w-[640px]" @submit.prevent="save">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{{ $t("account.profile") }}</h2>
          </CardTitle>
        </CardHeader>

        <CardContent class="flex flex-col gap-5">
          <div class="flex flex-col gap-1">
            <span class="text-body-sm font-semibold">{{ $t("auth.email") }}</span>
            <span>{{ customer?.email }}</span>
          </div>

          <FieldGroup class="two-col">
            <Field>
              <FieldLabel for="account-first-name">{{ $t("auth.firstName") }}</FieldLabel>
              <Input id="account-first-name" v-model="form.first_name" name="first_name" />
            </Field>
            <Field>
              <FieldLabel for="account-last-name">{{ $t("auth.lastName") }}</FieldLabel>
              <Input id="account-last-name" v-model="form.last_name" name="last_name" />
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel for="account-phone">{{ $t("account.phone") }}</FieldLabel>
            <InputGroup>
              <InputGroupInput id="account-phone" v-model="form.phone" name="phone" type="tel" />
              <InputGroupAddon>
                <Phone aria-hidden="true" />
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Alert v-if="failed" variant="destructive">
            <AlertDescription>{{ $t("common.error") }}</AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter class="flex items-center gap-4">
          <Button type="submit" :disabled="busy">
            <Spinner v-if="busy" />
            {{ $t("common.save") }}
          </Button>
          <p v-if="saved" role="status" class="text-body-sm text-success">{{ $t("account.saved") }}</p>
        </CardFooter>
      </Card>
    </form>
  </AccountNav>
</template>
