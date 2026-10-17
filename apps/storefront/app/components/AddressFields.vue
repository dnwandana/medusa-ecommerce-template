<script setup lang="ts">
import type { AddressErrors, AddressFormValues } from "~/utils/addressForm"

type AddressFieldName = Exclude<keyof AddressFormValues, "address_name">

type AddressField = {
  name: AddressFieldName
  label: string
  autocomplete: string
  type?: string
  inputmode?: "tel" | "numeric"
  placeholder?: string
  hint?: string
}

const props = defineProps<{
  idPrefix: string
  errors: AddressErrors
  phone: boolean
  disabled?: boolean
}>()
const values = defineModel<AddressFormValues>({ required: true })

// The order is the order of the spec. The guest form has no phone field here, because the
// Contact card already asks for the phone.
const ALL_FIELDS: AddressField[] = [
  { name: "first_name", label: "checkout.firstName", autocomplete: "given-name" },
  { name: "last_name", label: "checkout.lastName", autocomplete: "family-name" },
  {
    name: "phone",
    label: "checkout.phone",
    autocomplete: "tel",
    type: "tel",
    inputmode: "tel",
    hint: "checkout.phoneHint",
  },
  {
    name: "address_1",
    label: "checkout.address1",
    autocomplete: "street-address",
    placeholder: "checkout.addressPlaceholder",
    hint: "checkout.addressHint",
  },
  { name: "city", label: "checkout.city", autocomplete: "address-level2" },
  { name: "province", label: "checkout.province", autocomplete: "address-level1" },
  {
    name: "postal_code",
    label: "checkout.postalCode",
    autocomplete: "postal-code",
    inputmode: "numeric",
  },
]

const fields = computed(() =>
  props.phone ? ALL_FIELDS : ALL_FIELDS.filter((field) => field.name !== "phone")
)

// The prefix keeps each id unique when two address forms are on one page.
function controlId(name: AddressFieldName): string {
  return `${props.idPrefix}-${name}`
}

// A new object tells the parent that the model changed, also when the parent watches the object.
function update(name: AddressFieldName, value: string | number): void {
  values.value = { ...values.value, [name]: String(value) }
}
</script>

<template>
  <!-- One column at all widths (spec 6.1), so the FieldGroup has no "two-col" class. -->
  <FieldGroup data-testid="address-fields">
    <Field v-for="field in fields" :key="field.name">
      <FieldLabel :for="controlId(field.name)">{{ $t(field.label) }}</FieldLabel>
      <Textarea
        v-if="field.name === 'address_1'"
        :id="controlId(field.name)"
        :model-value="values[field.name]"
        :name="field.name"
        rows="3"
        class="min-h-0"
        :placeholder="field.placeholder ? $t(field.placeholder) : undefined"
        :autocomplete="field.autocomplete"
        :disabled="disabled"
        :aria-invalid="errors[field.name] ? true : undefined"
        :aria-describedby="field.hint ? `${controlId(field.name)}-hint` : undefined"
        @update:model-value="update(field.name, $event)"
      />
      <Input
        v-else
        :id="controlId(field.name)"
        :model-value="values[field.name]"
        :name="field.name"
        :type="field.type ?? 'text'"
        :inputmode="field.inputmode"
        :autocomplete="field.autocomplete"
        :disabled="disabled"
        :aria-invalid="errors[field.name] ? true : undefined"
        :aria-describedby="field.hint ? `${controlId(field.name)}-hint` : undefined"
        @update:model-value="update(field.name, $event)"
      />
      <FieldDescription v-if="field.hint" :id="`${controlId(field.name)}-hint`">
        {{ $t(field.hint) }}
      </FieldDescription>
      <FieldError v-if="errors[field.name]">{{ $t(errors[field.name]!) }}</FieldError>
    </Field>
  </FieldGroup>
</template>
