<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { Plus } from "@lucide/vue"
import type { AddressErrors, AddressFormValues } from "~/utils/addressForm"
import { NEW_ADDRESS, addressLine, fromCustomerAddress } from "~/utils/addressForm"

const props = defineProps<{
  addresses: HttpTypes.StoreCustomerAddress[]
  state: AddressListState
  errors: AddressErrors
  disabled: boolean
}>()
// An address id, or NEW_ADDRESS.
const selected = defineModel<string>("selected", { required: true })
const form = defineModel<AddressFormValues>("form", { required: true })
const save = defineModel<boolean>("save", { required: true })
const makeDefault = defineModel<boolean>("makeDefault", { required: true })

defineEmits<{ retry: [] }>()

// Case A: the customer has saved addresses, so the radio list shows.
const hasList = computed(() => props.state === "ready" && props.addresses.length > 0)
// Case A shows the fields only for "Use a new address". Case B and a failed load always show them.
const showFields = computed(() => !hasList.value || selected.value === NEW_ADDRESS)
// After a failed load, the list is not known. A save as the "first" address could remove the
// default flag from a real saved address (spec 6.4).
const canSave = computed(() => props.state === "ready")

// The Medusa admin can save null values. The filters keep the text "null" and a lone "·" out of
// the radio item.
function contactLine(address: HttpTypes.StoreCustomerAddress): string {
  const name = [address.first_name, address.last_name].filter(Boolean).join(" ")
  return [name, address.phone].filter(Boolean).join(" · ")
}

function placeLine(address: HttpTypes.StoreCustomerAddress): string {
  return addressLine(fromCustomerAddress(address))
}

// A new object tells the parent that the model changed, as AddressFields does.
function updateLabel(value: string | number): void {
  form.value = { ...form.value, address_name: String(value) }
}

// The radio items look like the shipping options on the checkout page.
const ITEM_CLASS =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3.5 has-disabled:cursor-not-allowed has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-soft has-data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-primary)]"
</script>

<script lang="ts">
// The page imports this type, and <script setup> cannot export a type.
export type AddressListState = "loading" | "ready" | "failed"
</script>

<template>
  <div
    v-if="state === 'loading'"
    data-testid="address-picker-loading"
    role="status"
    class="flex flex-col gap-2"
  >
    <span class="sr-only">{{ $t("common.loading") }}</span>
    <Skeleton class="h-20 rounded-lg" />
    <Skeleton class="h-20 rounded-lg" />
  </div>

  <div v-else class="flex flex-col gap-4">
    <Alert v-if="state === 'failed'" variant="destructive">
      <AlertDescription>{{ $t("checkout.addressesLoadError") }}</AlertDescription>
      <AlertAction>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="address-retry"
          :disabled="disabled"
          @click="$emit('retry')"
        >
          {{ $t("common.retry") }}
        </Button>
      </AlertAction>
    </Alert>

    <p v-else-if="!hasList" class="text-body-sm text-muted-foreground">
      {{ $t("checkout.noAddresses") }}
    </p>

    <!-- No gap here, so that the fields panel joins the "Use a new address" item above it. -->
    <div class="flex flex-col">
      <RadioGroup
        v-if="hasList"
        name="saved_address"
        :model-value="selected"
        :disabled="disabled"
        @update:model-value="(value) => (selected = String(value))"
      >
        <!-- A <label> around the item makes a click anywhere on the item select it. -->
        <label
          v-for="address in addresses"
          :key="address.id"
          :data-testid="`address-option-${address.id}`"
          :class="ITEM_CLASS"
        >
          <RadioGroupItem :id="`saved-address-${address.id}`" :value="address.id" class="mt-0.5" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="flex flex-wrap items-center gap-2 font-semibold">
              {{ address.address_name || $t("account.addresses.untitled") }}
              <Badge v-if="address.is_default_shipping">
                {{ $t("account.addresses.default") }}
              </Badge>
            </span>
            <span v-if="contactLine(address)" class="text-body-sm">
              {{ contactLine(address) }}
            </span>
            <span v-if="placeLine(address)" class="text-body-sm text-muted-foreground">
              {{ placeLine(address) }}
            </span>
          </span>
        </label>

        <label
          data-testid="address-option-new"
          :class="[ITEM_CLASS, 'has-data-[state=checked]:rounded-b-none']"
        >
          <RadioGroupItem id="saved-address-new" :value="NEW_ADDRESS" class="mt-0.5" />
          <span class="flex min-w-0 flex-col gap-0.5">
            <span class="flex items-center gap-2 font-semibold">
              <Plus aria-hidden="true" class="size-4" />
              {{ $t("checkout.useNew") }}
            </span>
            <span v-if="selected !== NEW_ADDRESS" class="text-body-sm text-muted-foreground">
              {{ $t("checkout.useNewHint") }}
            </span>
          </span>
        </label>
      </RadioGroup>

      <!-- The fields are not in the radio group, so that a screen reader does not read them as a
           part of the list. In Case A, the border makes them look like a part of the last item. -->
      <div
        v-if="showFields"
        class="flex flex-col gap-6"
        :class="
          hasList ? 'rounded-b-lg border-x-2 border-b-2 border-primary bg-card p-4' : undefined
        "
      >
        <!-- The Contact card of the checkout page uses the ids checkout-<name>, for example
             checkout-phone. This prefix keeps each id on the page unique. -->
        <AddressFields
          v-model="form"
          id-prefix="checkout-address"
          :errors="errors"
          :phone="true"
          :disabled="disabled"
        />

        <div v-if="canSave" class="flex flex-col gap-4">
          <Field orientation="horizontal">
            <Checkbox
              id="checkout-save-address"
              v-model="save"
              data-testid="save-address"
              :disabled="disabled"
            />
            <FieldLabel for="checkout-save-address">{{ $t("checkout.saveToAccount") }}</FieldLabel>
          </Field>

          <!-- The nested block shows that these fields belong to the save checkbox. -->
          <FieldGroup v-if="save" class="ml-2 border-l-2 border-border pl-4">
            <Field>
              <FieldLabel for="checkout-address_name">{{ $t("checkout.label") }}</FieldLabel>
              <Input
                id="checkout-address_name"
                :model-value="form.address_name"
                name="address_name"
                autocomplete="off"
                :placeholder="$t('checkout.labelPlaceholder')"
                :disabled="disabled"
                @update:model-value="updateLabel"
              />
            </Field>
            <Field v-if="hasList" orientation="horizontal">
              <Checkbox
                id="checkout-make-default"
                v-model="makeDefault"
                data-testid="make-default"
                :disabled="disabled"
              />
              <FieldLabel for="checkout-make-default">
                {{ $t("account.addresses.useAsDefault") }}
              </FieldLabel>
            </Field>
            <FieldDescription v-else>{{ $t("checkout.firstAddressHint") }}</FieldDescription>
          </FieldGroup>
        </div>
      </div>
    </div>

    <p v-if="hasList" class="text-body-sm">
      <NuxtLinkLocale to="/account/addresses" class="text-link underline-offset-4 hover:underline">
        {{ $t("checkout.manage") }}
      </NuxtLinkLocale>
    </p>
  </div>
</template>
